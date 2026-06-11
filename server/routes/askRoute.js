const express = require("express");

const router = express.Router();

const {
    generateQueryPlan,
    generateInsight
} = require("../services/geminiService");

const {
    getFilePath
} = require("../services/fileStorage");


// SUPPORTED OPERATIONS
const SUPPORTED_OPERATIONS = [
    "trend_analysis",
    "max_value",
    "min_value",
    "average",
    "sum",
    "count",
    "top_n",
    "grouped_summary"
];

// SUPPORTED CHARTS
const SUPPORTED_CHARTS = [
    "line",
    "bar",
    "pie",
    "scatter",
    "kpi"
];


// NORMALIZE AI PLAN
function normalizePlan(plan) {

    // DEFAULTS
    plan.limit =
        Number(plan.limit) || 10;

    plan.filters =
        plan.filters || {};

    plan.sort_order =
        plan.sort_order || "desc";

    // INVALID OPERATION
    if (
        !SUPPORTED_OPERATIONS.includes(
            plan.operation
        )
    ) {

        // SMART FALLBACKS

        // FILTER QUERY
        if (
            Object.keys(plan.filters || {})
                .length > 0
        ) {

            if (plan.group_by) {

                plan.operation = "count";
                plan.metric = "*";
                plan.chart_type = "bar";

            } else {

                plan.operation = "count";
                plan.metric = "*";
                plan.chart_type = "kpi";
            }

        } else {

            plan.operation = "count";
            plan.metric = "*";
            plan.chart_type = "kpi";
        }
    }

    // INVALID CHART TYPE
    if (
        !SUPPORTED_CHARTS.includes(
            plan.chart_type
        )
    ) {

        // AUTO FIX
        if (
            plan.operation === "count"
            ||
            plan.operation === "grouped_summary"
            ||
            plan.operation === "top_n"
        ) {

            plan.chart_type = "bar";

        } else {

            plan.chart_type = "kpi";
        }
    }

    // COUNT FIX
    if (plan.operation === "count") {

        plan.metric = "*";

        if (plan.group_by) {

            plan.chart_type = "bar";

        } else {

            plan.chart_type = "kpi";
        }
    }

    // KPI FIX
    if (
        [
            "average",
            "sum",
            "max_value",
            "min_value"
        ].includes(plan.operation)
        &&
        !plan.group_by
    ) {

        plan.chart_type = "kpi";
    }

    return plan;
}


// ASK ROUTE
router.post("/", async (req, res) => {

    try {

        const {
            query,
            schema
        } = req.body;

        // VALIDATION
        if (!query) {

            return res.status(400).json({
                error: "Query is required"
            });
        }

        if (
            !schema
            ||
            !Array.isArray(schema)
        ) {

            return res.status(400).json({
                error: "Invalid schema"
            });
        }

        // STEP 1 → GENERATE AI PLAN
        const rawResponse =
            await generateQueryPlan(
                query,
                schema
            );

        console.log(
            "Gemini Raw Response:",
            rawResponse
        );

        // REMOVE MARKDOWN
        const cleanedResponse =
            rawResponse
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();

        let plan;

        // SAFE PARSE
        try {

            plan = JSON.parse(
                cleanedResponse
            );

        } catch (parseError) {

            console.log(
                "JSON Parse Error:",
                parseError.message
            );

            return res.status(500).json({

                error:
                "AI returned invalid JSON.",

                rawResponse
            });
        }

        // NORMALIZE + VALIDATE
        plan = normalizePlan(plan);

        console.log(
            "FINAL PLAN:",
            plan
        );

        // STEP 2 → GET FILE PATH
        const filePath =
            getFilePath();

        if (!filePath) {

            return res.status(400).json({

                error:
                "No uploaded file found."
            });
        }

        console.log(
            "USING FILE PATH:",
            filePath
        );

        // STEP 3 → SEND TO PYTHON
        const pythonResponse =
            await fetch(
                "http://127.0.0.1:8000/analyze",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                        "application/json"
                    },

                    body: JSON.stringify({

                        filePath,

                        instructions: plan
                    })
                }
            );

        // HANDLE PYTHON ERRORS
        if (!pythonResponse.ok) {

            const errorData =
                await pythonResponse.json();

            console.log(
                "Python Error:",
                errorData
            );

            return res.status(
                pythonResponse.status
            ).json({

                error:
                errorData.detail
                ||
                "Python service failed"
            });
        }

        // STEP 4 → RECEIVE ANALYTICS
        const pythonData =
            await pythonResponse.json();

        // STEP 5 → GENERATE INSIGHT
        let insight = null;

        try {

            insight =
                await generateInsight(
                    query,
                    pythonData
                );

        } catch (insightError) {

            console.log(
                "Insight generation failed:",
                insightError.message
            );
        }

        // FINAL RESPONSE
        res.json({

            plan,

            analytics:
                pythonData,

            chartType:
                plan.chart_type,

            insight
        });

    } catch (error) {

        console.log(
            "SERVER ERROR:",
            error
        );

        // RATE LIMIT
        if (
            error.message &&
            error.message.includes("429")
        ) {

            return res.status(429).json({

                error:
                "AI servers are busy. Please wait and try again."
            });
        }

        // GENERIC ERROR
        res.status(500).json({

            error:
                error.message
                ||
                "Internal server error"
        });
    }
});

module.exports = router;