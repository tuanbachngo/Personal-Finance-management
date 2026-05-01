-- Migration: add Banks catalog and connect BankAccounts by BankID.
-- Safe for existing Personal_Finance databases; does not drop data.

USE Personal_Finance;

CREATE TABLE IF NOT EXISTS Banks (
    BankID INT AUTO_INCREMENT PRIMARY KEY,
    BankCode VARCHAR(30) NOT NULL UNIQUE,
    BankName VARCHAR(100) NOT NULL UNIQUE,
    IsActive TINYINT(1) NOT NULL DEFAULT 1
);

INSERT INTO Banks (BankID, BankCode, BankName, IsActive) VALUES
(1, 'VCB', 'Vietcombank', 1),
(2, 'TCB', 'Techcombank', 1),
(3, 'BIDV', 'BIDV', 1),
(4, 'ACB', 'ACB', 1),
(5, 'MBB', 'MB Bank', 1),
(6, 'CTG', 'VietinBank', 1),
(7, 'TPB', 'TPBank', 1),
(8, 'STB', 'Sacombank', 1),
(9, 'VPB', 'VPBank', 1),
(10, 'AGR', 'Agribank', 1),
(11, 'SHB', 'SHB', 1),
(12, 'HDB', 'HDBank', 1),
(13, 'VIB', 'VIB', 1),
(14, 'MSB', 'MSB', 1),
(15, 'OCB', 'OCB', 1),
(16, 'LPB', 'LPBank', 1),
(17, 'EIB', 'Eximbank', 1),
(18, 'NAB', 'Nam A Bank', 1),
(19, 'BAB', 'Bac A Bank', 1),
(20, 'ABB', 'ABBANK', 1),
(21, 'SEAB', 'SeABank', 1),
(22, 'PVCOM', 'PVcomBank', 1),
(23, 'KLB', 'KienlongBank', 1)
ON DUPLICATE KEY UPDATE
    BankCode = VALUES(BankCode),
    BankName = VALUES(BankName),
    IsActive = VALUES(IsActive);

DROP PROCEDURE IF EXISTS migrate_bank_catalog;
DELIMITER //
CREATE PROCEDURE migrate_bank_catalog()
BEGIN
    DECLARE has_bank_id INT DEFAULT 0;
    DECLARE has_bank_name INT DEFAULT 0;
    DECLARE null_bank_id_count INT DEFAULT 0;

    SELECT COUNT(*)
    INTO has_bank_id
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'BankAccounts'
      AND COLUMN_NAME = 'BankID';

    IF has_bank_id = 0 THEN
        ALTER TABLE BankAccounts ADD COLUMN BankID INT NULL AFTER UserID;
    END IF;

    SELECT COUNT(*)
    INTO has_bank_name
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'BankAccounts'
      AND COLUMN_NAME = 'BankName';

    IF has_bank_name > 0 THEN
        SET @insert_legacy_banks_sql = '
            INSERT INTO Banks (BankCode, BankName, IsActive)
            SELECT DISTINCT
                CONCAT(''LEGACY_'', CRC32(TRIM(ba.BankName))) AS BankCode,
                TRIM(ba.BankName) AS BankName,
                1 AS IsActive
            FROM BankAccounts ba
            WHERE ba.BankName IS NOT NULL
              AND TRIM(ba.BankName) <> ''''
              AND NOT EXISTS (
                  SELECT 1 FROM Banks b WHERE b.BankName = TRIM(ba.BankName)
              )
        ';
        PREPARE insert_legacy_banks_stmt FROM @insert_legacy_banks_sql;
        EXECUTE insert_legacy_banks_stmt;
        DEALLOCATE PREPARE insert_legacy_banks_stmt;

        SET @map_bank_ids_sql = '
            UPDATE BankAccounts ba
            JOIN Banks b ON b.BankName = TRIM(ba.BankName)
            SET ba.BankID = b.BankID
            WHERE ba.BankID IS NULL
        ';
        PREPARE map_bank_ids_stmt FROM @map_bank_ids_sql;
        EXECUTE map_bank_ids_stmt;
        DEALLOCATE PREPARE map_bank_ids_stmt;

        -- Keep the legacy column nullable for rollback safety. New code ignores it.
        ALTER TABLE BankAccounts MODIFY BankName VARCHAR(100) NULL;
    END IF;

    SELECT COUNT(*)
    INTO null_bank_id_count
    FROM BankAccounts
    WHERE BankID IS NULL;

    IF null_bank_id_count > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot migrate BankAccounts: some rows could not be mapped to Banks.BankID.';
    END IF;

    ALTER TABLE BankAccounts MODIFY BankID INT NOT NULL;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'BankAccounts'
          AND INDEX_NAME = 'idx_bankaccounts_bankid'
    ) THEN
        CREATE INDEX idx_bankaccounts_bankid ON BankAccounts(BankID);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'Banks'
          AND INDEX_NAME = 'idx_banks_active_name'
    ) THEN
        CREATE INDEX idx_banks_active_name ON Banks(IsActive, BankName);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'BankAccounts'
          AND CONSTRAINT_NAME = 'uq_bankaccounts_user_bank'
    ) THEN
        ALTER TABLE BankAccounts
            ADD CONSTRAINT uq_bankaccounts_user_bank UNIQUE (UserID, BankID);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'BankAccounts'
          AND CONSTRAINT_NAME = 'fk_bankaccounts_bank'
    ) THEN
        ALTER TABLE BankAccounts
            ADD CONSTRAINT fk_bankaccounts_bank
                FOREIGN KEY (BankID)
                REFERENCES Banks(BankID)
                ON DELETE RESTRICT
                ON UPDATE CASCADE;
    END IF;
END//
DELIMITER ;

CALL migrate_bank_catalog();
DROP PROCEDURE IF EXISTS migrate_bank_catalog;
