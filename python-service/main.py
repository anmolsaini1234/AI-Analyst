from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict

import pandas as pd
import numpy as np

import re

from difflib import get_close_matches

app = FastAPI()


# ==========================================
# COLUMN NORMALIZATION
# ==========================================

def normalize_column(column):

    return re.sub(
        r'[^a-z0-9]',
        '',
        column.lower()
    )


# ==========================================
# RESOLVE COLUMN NAME
# ==========================================

def resolve_column_name(
    requested_column,
    actual_columns
):

    if not requested_column:
        return None

    # EXACT MATCH
    if requested_column in actual_columns:
        return requested_column

    normalized_actual = {

        normalize_column(col): col
        for col in actual_columns
    }

    normalized_requested = normalize_column(
        requested_column
    )

    # NORMALIZED MATCH
    if normalized_requested in normalized_actual:

        return normalized_actual[
            normalized_requested
        ]

    # FUZZY MATCH
    closest = get_close_matches(

        normalized_requested,

        normalized_actual.keys(),

        n=1,

        cutoff=0.6
    )

    if closest:

        return normalized_actual[
            closest[0]
        ]

    return None


# ==========================================
# REQUEST MODEL
# ==========================================

class AnalyzeRequest(BaseModel):

    filePath: str
    instructions: Dict[str, Any]


# ==========================================
# ANALYZE ROUTE
# ==========================================

@app.post("/analyze")
def analyze_data(request: AnalyzeRequest):

    # ==========================================
    # LOAD CSV
    # ==========================================

    try:

        df = pd.read_csv(
            request.filePath
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to load CSV: {str(e)}"
        )

    # ==========================================
    # EXTRACT INSTRUCTIONS
    # ==========================================

    operation = request.instructions.get(
        "operation"
    )

    metric = request.instructions.get(
        "metric"
    )

    group_by = request.instructions.get(
        "group_by"
    )

    limit = request.instructions.get(
        "limit",
        10
    )

    filters = request.instructions.get(
        "filters",
        {}
    )

    if not operation:

        raise HTTPException(
            status_code=400,
            detail="Operation is missing"
        )

    # ==========================================
    # RESOLVE FILTER COLUMNS
    # ==========================================

    resolved_filters = {}

    for column, conditions in filters.items():

        resolved_column = resolve_column_name(
            column,
            df.columns
        )

        if resolved_column:

            resolved_filters[
                resolved_column
            ] = conditions

    filters = resolved_filters

    # ==========================================
    # APPLY FILTERS
    # ==========================================

    for column, conditions in filters.items():

        # TRY NUMERIC CONVERSION
        try:

            df[column] = pd.to_numeric(
                df[column],
                errors="ignore"
            )

        except:
            pass

        # BETWEEN
        if "between" in conditions:

            start, end = conditions["between"]

            df = df[
                (df[column] >= start)
                &
                (df[column] <= end)
            ]

        # GREATER THAN
        if "greater_than" in conditions:

            df = df[
                df[column]
                >
                conditions["greater_than"]
            ]

        # LESS THAN
        if "less_than" in conditions:

            df = df[
                df[column]
                <
                conditions["less_than"]
            ]

        # EQUALS
        if "equals" in conditions:

            df = df[
                df[column]
                ==
                conditions["equals"]
            ]

    # ==========================================
    # EMPTY DATA CHECK
    # ==========================================

    if df.empty:

        return {

            "chartData": [],

            "warning":
            "No matching data found"
        }

    # ==========================================
    # RESOLVE GROUP BY COLUMN
    # ==========================================

    if group_by:

        resolved_group_by = resolve_column_name(
            group_by,
            df.columns
        )

        if not resolved_group_by:

            raise HTTPException(
                status_code=400,
                detail=f"Group by column '{group_by}' not found"
            )

        group_by = resolved_group_by

    # ==========================================
    # RESOLVE METRIC COLUMN
    # ==========================================

    if (
        metric
        and
        metric != "*"
    ):

        resolved_metric = resolve_column_name(
            metric,
            df.columns
        )

        if not resolved_metric:

            raise HTTPException(
                status_code=400,
                detail=f"Metric column '{metric}' not found"
            )

        metric = resolved_metric

        # CONVERT TO NUMERIC
        df[metric] = pd.to_numeric(
            df[metric],
            errors="coerce"
        )

        # REMOVE NaN
        df = df.dropna(
            subset=[metric]
        )

    chart_data = []

    # ==========================================
    # EXECUTE OPERATION
    # ==========================================

    try:

        # TREND ANALYSIS
        if operation == "trend_analysis":

            grouped = (
                df.groupby(group_by)[metric]
                .mean()
                .reset_index()
            )

            chart_data = grouped.to_dict(
                orient="records"
            )

        # MAX VALUE
        elif operation == "max_value":

            max_row = df.loc[
                df[metric].idxmax()
            ]

            chart_data = [
                max_row.to_dict()
            ]

        # MIN VALUE
        elif operation == "min_value":

            min_row = df.loc[
                df[metric].idxmin()
            ]

            chart_data = [
                min_row.to_dict()
            ]

        # AVERAGE
        elif operation == "average":

            chart_data = [
                {
                    metric:
                    float(df[metric].mean())
                }
            ]

        # SUM
        elif operation == "sum":

            chart_data = [
                {
                    metric:
                    float(df[metric].sum())
                }
            ]

        # COUNT
        elif operation == "count":

            # GROUPED COUNT
            if group_by:

                grouped = (
                    df.groupby(group_by)
                    .size()
                    .reset_index(name="count")
                )

                chart_data = grouped.to_dict(
                    orient="records"
                )

            # SIMPLE COUNT
            else:

                chart_data = [
                    {
                        "count":
                        int(len(df))
                    }
                ]

        # TOP N
        elif operation == "top_n":

            top_rows = df.nlargest(
                limit,
                metric
            )

            chart_data = top_rows.to_dict(
                orient="records"
            )

        # GROUPED SUMMARY
        elif operation == "grouped_summary":

            grouped = (
                df.groupby(group_by)[metric]
                .sum()
                .reset_index()
            )

            chart_data = grouped.to_dict(
                orient="records"
            )

        # INVALID OPERATION
        else:

            raise HTTPException(
                status_code=400,
                detail=f"Unsupported operation '{operation}'"
            )

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    # ==========================================
    # CLEAN JSON VALUES
    # ==========================================

    cleaned_data = []

    for row in chart_data:

        cleaned_row = {}

        for key, value in row.items():

            # NUMPY INTEGER
            if isinstance(
                value,
                (
                    np.integer,
                    np.int64
                )
            ):

                cleaned_row[key] = int(value)

            # FLOAT
            elif isinstance(
                value,
                (
                    np.floating,
                    np.float64,
                    float
                )
            ):

                if (
                    np.isnan(value)
                    or
                    np.isinf(value)
                ):

                    cleaned_row[key] = None

                else:

                    cleaned_row[key] = float(value)

            # NORMAL VALUE
            else:

                cleaned_row[key] = value

        cleaned_data.append(
            cleaned_row
        )

    # ==========================================
    # FINAL RESPONSE
    # ==========================================

    return {

        "chartData":
        cleaned_data
    }