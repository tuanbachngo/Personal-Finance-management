"""
Goal repository for Personal_Finance.

This repository handles SavingGoals and GoalContributions.
"""

from typing import Any, Dict, List, Optional


class GoalRepository:
    def __init__(self, connection) -> None:
        self.connection = connection

    def _fetch_all(self, query: str, params=()) -> List[Dict[str, Any]]:
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query, params)
            return cursor.fetchall()
        finally:
            cursor.close()

    def _fetch_one(self, query: str, params=()) -> Optional[Dict[str, Any]]:
        rows = self._fetch_all(query, params)
        return rows[0] if rows else None

    def get_goal_by_id(self, goal_id: int) -> Optional[Dict[str, Any]]:
        return self._fetch_one(
            """
            SELECT
                GoalID, UserID, LinkedAccountID, GoalName, GoalType,
                TargetAmount, CurrentAmount, StartDate, TargetDate,
                AnnualGrowthRate, Status, Notes, CreatedAt
            FROM SavingGoals
            WHERE GoalID = %s
            """,
            (goal_id,),
        )

    def get_goals(self, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        return self._fetch_all(
            """
            SELECT
                GoalID, UserID, LinkedAccountID, GoalName, GoalType,
                TargetAmount, CurrentAmount, StartDate, TargetDate,
                AnnualGrowthRate, Status, Notes, CreatedAt
            FROM SavingGoals
            WHERE (%s IS NULL OR UserID = %s)
            ORDER BY
                FIELD(Status, 'ACTIVE', 'COMPLETED', 'CANCELLED'),
                TargetDate IS NULL,
                TargetDate,
                GoalID
            """,
            (user_id, user_id),
        )

    def get_goal_progress(self, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        return self._fetch_all(
            """
            SELECT
                GoalID, UserID, UserName, LinkedAccountID, BankName,
                GoalName, GoalType, TargetAmount, CurrentAmount,
                RemainingAmount, ProgressPercent, StartDate, TargetDate,
                DaysRemaining, MonthlyRequired, AnnualGrowthRate,
                Status, GoalAlertLevel, Notes, CreatedAt
            FROM vw_saving_goal_progress
            WHERE (%s IS NULL OR UserID = %s)
            ORDER BY
                FIELD(Status, 'ACTIVE', 'COMPLETED', 'CANCELLED'),
                TargetDate IS NULL,
                TargetDate,
                GoalID
            """,
            (user_id, user_id),
        )

    def create_goal(
        self,
        user_id: int,
        linked_account_id: Optional[int],
        goal_name: str,
        goal_type: str,
        target_amount: float,
        current_amount: float,
        start_date,
        target_date,
        annual_growth_rate: float,
        status: str,
        notes: Optional[str],
    ) -> int:
        cursor = self.connection.cursor()
        try:
            cursor.execute(
                """
                INSERT INTO SavingGoals (
                    UserID, LinkedAccountID, GoalName, GoalType,
                    TargetAmount, CurrentAmount, StartDate, TargetDate,
                    AnnualGrowthRate, Status, Notes
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    user_id,
                    linked_account_id,
                    goal_name,
                    goal_type,
                    target_amount,
                    current_amount,
                    start_date,
                    target_date,
                    annual_growth_rate,
                    status,
                    notes,
                ),
            )
            self.connection.commit()
            return int(cursor.lastrowid)
        finally:
            cursor.close()

    def update_goal(
        self,
        goal_id: int,
        user_id: int,
        linked_account_id: Optional[int],
        goal_name: str,
        goal_type: str,
        target_amount: float,
        current_amount: float,
        start_date,
        target_date,
        annual_growth_rate: float,
        status: str,
        notes: Optional[str],
    ) -> None:
        cursor = self.connection.cursor()
        try:
            cursor.execute(
                """
                UPDATE SavingGoals
                SET
                    LinkedAccountID = %s,
                    GoalName = %s,
                    GoalType = %s,
                    TargetAmount = %s,
                    CurrentAmount = %s,
                    StartDate = %s,
                    TargetDate = %s,
                    AnnualGrowthRate = %s,
                    Status = %s,
                    Notes = %s
                WHERE GoalID = %s AND UserID = %s
                """,
                (
                    linked_account_id,
                    goal_name,
                    goal_type,
                    target_amount,
                    current_amount,
                    start_date,
                    target_date,
                    annual_growth_rate,
                    status,
                    notes,
                    goal_id,
                    user_id,
                ),
            )
            self.connection.commit()
        finally:
            cursor.close()

    def delete_goal(self, goal_id: int, user_id: int) -> None:
        cursor = self.connection.cursor()
        try:
            cursor.execute(
                """
                DELETE FROM SavingGoals
                WHERE GoalID = %s AND UserID = %s
                """,
                (goal_id, user_id),
            )
            self.connection.commit()
        finally:
            cursor.close()

    def get_goal_contributions(
        self,
        goal_id: int,
        user_id: int,
    ) -> List[Dict[str, Any]]:
        return self._fetch_all(
            """
            SELECT
                ContributionID, GoalID, UserID, AccountID,
                Amount, ContributionType, ContributionDate,
                Description, CreatedAt
            FROM GoalContributions
            WHERE GoalID = %s AND UserID = %s
            ORDER BY ContributionDate DESC, ContributionID DESC
            """,
            (goal_id, user_id),
        )

    def add_goal_contribution(
        self,
        goal_id: int,
        user_id: int,
        account_id: Optional[int],
        amount: float,
        contribution_type: str,
        contribution_date,
        description: Optional[str],
        cursor=None,
        commit: bool = True,
    ) -> int:
        owns_cursor = cursor is None
        exec_cursor = cursor or self.connection.cursor()
        try:
            exec_cursor.execute(
                """
                INSERT INTO GoalContributions (
                    GoalID, UserID, AccountID, Amount,
                    ContributionType, ContributionDate, Description
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    goal_id,
                    user_id,
                    account_id,
                    amount,
                    contribution_type,
                    contribution_date,
                    description,
                ),
            )
            contribution_id = int(exec_cursor.lastrowid)

            if contribution_type == "DEPOSIT":
                exec_cursor.execute(
                    """
                    UPDATE SavingGoals
                    SET CurrentAmount = CurrentAmount + %s
                    WHERE GoalID = %s AND UserID = %s
                    """,
                    (amount, goal_id, user_id),
                )
            else:
                exec_cursor.execute(
                    """
                    UPDATE SavingGoals
                    SET CurrentAmount = CurrentAmount - %s
                    WHERE GoalID = %s
                      AND UserID = %s
                      AND CurrentAmount >= %s
                    """,
                    (amount, goal_id, user_id, amount),
                )
                if exec_cursor.rowcount == 0:
                    raise ValueError("Cannot withdraw more than the current goal amount.")

            exec_cursor.execute(
                """
                UPDATE SavingGoals
                SET Status =
                    CASE
                        WHEN CurrentAmount >= TargetAmount THEN 'COMPLETED'
                        WHEN Status = 'COMPLETED' AND CurrentAmount < TargetAmount THEN 'ACTIVE'
                        ELSE Status
                    END
                WHERE GoalID = %s AND UserID = %s
                """,
                (goal_id, user_id),
            )

            if commit:
                self.connection.commit()
            return contribution_id
        except Exception:
            if commit:
                self.connection.rollback()
            raise
        finally:
            if owns_cursor:
                exec_cursor.close()

    def get_goal_contribution_by_id(self, contribution_id: int) -> Optional[Dict[str, Any]]:
        return self._fetch_one(
            """
            SELECT
                ContributionID, GoalID, UserID, AccountID,
                Amount, ContributionType, ContributionDate,
                Description, CreatedAt
            FROM GoalContributions
            WHERE ContributionID = %s
            """,
            (contribution_id,),
        )

    def delete_goal_contribution(
        self,
        contribution_id: int,
        user_id: int,
        cursor=None,
        commit: bool = True,
    ) -> None:
        owns_cursor = cursor is None
        exec_cursor = cursor or self.connection.cursor(dictionary=True)
        try:
            exec_cursor.execute(
                """
                SELECT ContributionID, GoalID, UserID, Amount, ContributionType
                FROM GoalContributions
                WHERE ContributionID = %s AND UserID = %s
                """,
                (contribution_id, user_id),
            )
            row = exec_cursor.fetchone()
            if row is None:
                return

            goal_id = int(row["GoalID"])
            amount = float(row["Amount"])
            contribution_type = str(row["ContributionType"]).upper()

            if contribution_type == "DEPOSIT":
                exec_cursor.execute(
                    """
                    UPDATE SavingGoals
                    SET CurrentAmount = GREATEST(CurrentAmount - %s, 0)
                    WHERE GoalID = %s AND UserID = %s
                    """,
                    (amount, goal_id, user_id),
                )
            else:
                exec_cursor.execute(
                    """
                    UPDATE SavingGoals
                    SET CurrentAmount = CurrentAmount + %s
                    WHERE GoalID = %s AND UserID = %s
                    """,
                    (amount, goal_id, user_id),
                )

            exec_cursor.execute(
                """
                DELETE FROM GoalContributions
                WHERE ContributionID = %s AND UserID = %s
                """,
                (contribution_id, user_id),
            )

            exec_cursor.execute(
                """
                UPDATE SavingGoals
                SET Status =
                    CASE
                        WHEN CurrentAmount >= TargetAmount THEN 'COMPLETED'
                        WHEN Status = 'COMPLETED' AND CurrentAmount < TargetAmount THEN 'ACTIVE'
                        ELSE Status
                    END
                WHERE GoalID = %s AND UserID = %s
                """,
                (goal_id, user_id),
            )

            if commit:
                self.connection.commit()
        except Exception:
            if commit:
                self.connection.rollback()
            raise
        finally:
            if owns_cursor:
                exec_cursor.close()

    def get_transaction_goal_link(
        self,
        source_type: str,
        source_transaction_id: int,
    ) -> Optional[Dict[str, Any]]:
        return self._fetch_one(
            """
            SELECT
                l.LinkID,
                l.UserID,
                l.GoalID,
                l.ContributionID,
                l.SourceType,
                l.SourceTransactionID,
                l.ContributionType,
                g.GoalName,
                g.GoalType
            FROM TransactionGoalLinks l
            LEFT JOIN SavingGoals g ON g.GoalID = l.GoalID
            WHERE l.SourceType = %s AND l.SourceTransactionID = %s
            """,
            (source_type, source_transaction_id),
        )

    def get_transaction_goal_links_by_sources(
        self,
        source_type: str,
        source_transaction_ids: List[int],
    ) -> List[Dict[str, Any]]:
        if not source_transaction_ids:
            return []

        placeholders = ", ".join(["%s"] * len(source_transaction_ids))
        query = f"""
            SELECT
                l.LinkID,
                l.UserID,
                l.GoalID,
                l.ContributionID,
                l.SourceType,
                l.SourceTransactionID,
                l.ContributionType,
                g.GoalName,
                g.GoalType
            FROM TransactionGoalLinks l
            LEFT JOIN SavingGoals g ON g.GoalID = l.GoalID
            WHERE l.SourceType = %s
              AND l.SourceTransactionID IN ({placeholders})
        """
        params = (source_type, *source_transaction_ids)
        return self._fetch_all(query, params)

    def create_transaction_goal_link(
        self,
        user_id: int,
        goal_id: int,
        contribution_id: int,
        source_type: str,
        source_transaction_id: int,
        contribution_type: str,
        cursor=None,
        commit: bool = True,
    ) -> int:
        owns_cursor = cursor is None
        exec_cursor = cursor or self.connection.cursor()
        try:
            exec_cursor.execute(
                """
                INSERT INTO TransactionGoalLinks (
                    UserID,
                    GoalID,
                    ContributionID,
                    SourceType,
                    SourceTransactionID,
                    ContributionType
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    user_id,
                    goal_id,
                    contribution_id,
                    source_type,
                    source_transaction_id,
                    contribution_type,
                ),
            )
            link_id = int(exec_cursor.lastrowid)
            if commit:
                self.connection.commit()
            return link_id
        except Exception:
            if commit:
                self.connection.rollback()
            raise
        finally:
            if owns_cursor:
                exec_cursor.close()

    def delete_transaction_goal_link(
        self,
        source_type: str,
        source_transaction_id: int,
        cursor=None,
        commit: bool = True,
    ) -> None:
        owns_cursor = cursor is None
        exec_cursor = cursor or self.connection.cursor()
        try:
            exec_cursor.execute(
                """
                DELETE FROM TransactionGoalLinks
                WHERE SourceType = %s AND SourceTransactionID = %s
                """,
                (source_type, source_transaction_id),
            )
            if commit:
                self.connection.commit()
        except Exception:
            if commit:
                self.connection.rollback()
            raise
        finally:
            if owns_cursor:
                exec_cursor.close()
