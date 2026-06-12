const express = require("express");

const router = express.Router();

const {
    generateQueryPlan,
    generateInsight
} = require("../services/geminiService");

const {
    getFilePath
} = require("../services/fileStorage");


// ==========================================
// SUPPORTED OPERATIONS
// ==========================================

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


// ==========================================
// SUPPORTED CHARTS
// ==========================================

const SUPPORTED_CHARTS = [

    "line",

    "bar",

    "pie",

    "scatter",

    "kpi"
];


// ==========================================
// NORMALIZE PLAN
// ==========================================

function normalizePlan(plan) {

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

        plan.operation = "count";

        plan.metric = "*";

        plan.chart_type = "kpi";
    }

    // INVALID CHART TYPE
    if (
        !SUPPORTED_CHARTS.includes(
            plan.chart_type
        )
    ) {

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


// ==========================================
// ASK ROUTE
// ==========================================

router.post("/", async (req, res) => {

    try {

        const {
            query,
            schema
        } = req.body;

        // ==========================================
        // VALIDATION
        // ==========================================

        if (!query) {

            return res.status(400).json({

                error:
                "Query is required"
            });
        }

        if (
            !schema
            ||
            !Array.isArray(schema)
        ) {

            return res.status(400).json({

                error:
                "Invalid schema"
            });
        }

        // ==========================================
        // GENERATE AI PLAN
        // ==========================================

        const rawResponse =
            await generateQueryPlan(
                query,
                schema
            );

        console.log(
            "Gemini Raw Response:",
            rawResponse
        );

        // CLEAN RESPONSE
        const cleanedResponse =
            rawResponse
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();

        let plan;

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

        // ==========================================
        // NORMALIZE PLAN
        // ==========================================

        plan = normalizePlan(plan);

        console.log(
            "FINAL PLAN:",
            plan
        );

        // ==========================================
        // GET FILE PATH
        // ==========================================

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

        // ==========================================
        // SEND TO PYTHON API
        // ==========================================

        const pythonResponse =
            await fetch(
                "https://ai-analyst-ebr8.onrender.com/analyze",
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

        // ==========================================
        // HANDLE PYTHON ERRORS
        // ==========================================

        if (!pythonResponse.ok) {

            const errorText =
                await pythonResponse.text();

            console.log(
                "Python Raw Error:",
                errorText
            );

            let parsedError;

            try {

                parsedError =
                    JSON.parse(errorText);

            } catch {

                parsedError = {
                    detail: errorText
                };
            }

            return res.status(
                pythonResponse.status
            ).json({

                error:
                    parsedError.detail
                    ||
                    "Python service failed"
            });
        }

        // ==========================================
        // RECEIVE PYTHON DATA
        // ==========================================

        const responseText =
            await pythonResponse.text();

        let pythonData;

        try {

            pythonData =
                JSON.parse(responseText);

        } catch {

            console.log(
                "Invalid Python JSON:",
                responseText
            );

            return res.status(500).json({

                error:
                "Python API returned invalid JSON"
            });
        }

        // ==========================================
        // GENERATE INSIGHT
        // ==========================================

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

        // ==========================================
        // FINAL RESPONSE
        // ==========================================

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

        // GEMINI RATE LIMIT
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