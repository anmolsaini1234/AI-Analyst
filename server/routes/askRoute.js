const express = require("express");

const fs = require("fs");

const csv = require("csv-parser");

const router = express.Router();

const {
    generateQueryPlan,
    generateInsight
} = require("../services/geminiService");

const {
    getFilePath
} = require("../services/fileStorage");


// ==========================================
// LOAD CSV
// ==========================================

function loadCSV(filePath) {

    return new Promise((resolve, reject) => {

        const results = [];

        fs.createReadStream(filePath)

            .pipe(csv())

            .on("data", (data) => {

                results.push(data);
            })

            .on("end", () => {

                resolve(results);
            })

            .on("error", (error) => {

                reject(error);
            });
    });
}


// ==========================================
// TO NUMBER
// ==========================================

function toNumber(value) {

    const num = Number(value);

    return isNaN(num)
        ? null
        : num;
}


// ==========================================
// APPLY FILTERS
// ==========================================

function applyFilters(data, filters) {

    let filtered = [...data];

    for (const column in filters) {

        const condition = filters[column];

        filtered = filtered.filter((row) => {

            const value =
                toNumber(row[column]);

            // GREATER THAN
            if (
                condition.greater_than !== undefined
            ) {

                return (
                    value >
                    condition.greater_than
                );
            }

            // LESS THAN
            if (
                condition.less_than !== undefined
            ) {

                return (
                    value <
                    condition.less_than
                );
            }

            // BETWEEN
            if (
                condition.between
            ) {

                return (
                    value >= condition.between[0]
                    &&
                    value <= condition.between[1]
                );
            }

            // EQUALS
            if (
                condition.equals !== undefined
            ) {

                return (
                    row[column] ==
                    condition.equals
                );
            }

            return true;
        });
    }

    return filtered;
}


// ==========================================
// ANALYTICS ENGINE
// ==========================================

function executeAnalytics(data, plan) {

    const {
        operation,
        metric,
        group_by,
        limit,
        sort_order,
        filters
    } = plan;

    // APPLY FILTERS
    data = applyFilters(
        data,
        filters || {}
    );

    // EMPTY
    if (!data.length) {

        return {
            chartData: []
        };
    }

    // ==========================================
    // COUNT
    // ==========================================

    if (operation === "count") {

        // GROUPED COUNT
        if (group_by) {

            const grouped = {};

            data.forEach((row) => {

                const key =
                    row[group_by];

                grouped[key] =
                    (grouped[key] || 0) + 1;
            });

            return {

                chartData:
                    Object.entries(grouped)
                        .map(([key, value]) => ({

                            [group_by]: key,

                            count: value
                        }))
            };
        }

        // SIMPLE COUNT
        return {

            chartData: [
                {
                    count: data.length
                }
            ]
        };
    }

    // NUMERIC VALUES
    const numericData =
        data
            .map((row) => ({

                ...row,

                [metric]:
                    toNumber(row[metric])
            }))
            .filter(
                row =>
                    row[metric] !== null
            );

    // ==========================================
    // AVERAGE
    // ==========================================

    if (operation === "average") {

        const avg =
            numericData.reduce(

                (sum, row) =>
                    sum + row[metric],

                0

            ) / numericData.length;

        return {

            chartData: [
                {
                    average:
                        Number(avg.toFixed(2))
                }
            ]
        };
    }

    // ==========================================
    // SUM
    // ==========================================

    if (operation === "sum") {

        const total =
            numericData.reduce(

                (sum, row) =>
                    sum + row[metric],

                0
            );

        return {

            chartData: [
                {
                    sum:
                        Number(total.toFixed(2))
                }
            ]
        };
    }

    // ==========================================
    // MAX VALUE
    // ==========================================

    if (operation === "max_value") {

        const maxRow =
            numericData.reduce(

                (max, row) =>

                    row[metric] >
                    max[metric]

                        ? row
                        : max
            );

        return {

            chartData: [maxRow]
        };
    }

    // ==========================================
    // MIN VALUE
    // ==========================================

    if (operation === "min_value") {

        const minRow =
            numericData.reduce(

                (min, row) =>

                    row[metric] <
                    min[metric]

                        ? row
                        : min
            );

        return {

            chartData: [minRow]
        };
    }

    // ==========================================
    // TOP N
    // ==========================================

    if (operation === "top_n") {

        const sorted =
            [...numericData].sort((a, b) => {

                if (sort_order === "asc") {

                    return (
                        a[metric] -
                        b[metric]
                    );
                }

                return (
                    b[metric] -
                    a[metric]
                );
            });

        return {

            chartData:
                sorted.slice(0, limit)
        };
    }

    // ==========================================
    // GROUPED SUMMARY
    // ==========================================

    if (
        operation === "grouped_summary"
        ||
        operation === "trend_analysis"
    ) {

        const grouped = {};

        numericData.forEach((row) => {

            const key =
                row[group_by];

            if (!grouped[key]) {

                grouped[key] = [];
            }

            grouped[key].push(
                row[metric]
            );
        });

        const result =
            Object.entries(grouped)
                .map(([key, values]) => ({

                    [group_by]: key,

                    [metric]:

                        Number(

                            (
                                values.reduce(
                                    (a, b) => a + b,
                                    0
                                ) / values.length
                            ).toFixed(2)
                        )
                }));

        return {

            chartData: result
        };
    }

    return {
        chartData: []
    };
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

        // VALIDATION
        if (!query) {

            return res.status(400).json({

                error:
                    "Query is required"
            });
        }

        // GENERATE PLAN
        const rawResponse =
            await generateQueryPlan(
                query,
                schema
            );

        const cleanedResponse =
            rawResponse
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();

        let plan;

        try {

            plan =
                JSON.parse(cleanedResponse);

        } catch {

            return res.status(500).json({

                error:
                    "AI returned invalid JSON"
            });
        }

        console.log("PLAN:", plan);

        // GET FILE PATH
        const filePath =
            getFilePath();

        if (!filePath) {

            return res.status(400).json({

                error:
                    "No uploaded file found"
            });
        }

        // LOAD CSV
        const csvData =
            await loadCSV(filePath);

        // EXECUTE ANALYTICS
        const analytics =
            executeAnalytics(
                csvData,
                plan
            );

        // GENERATE INSIGHT
        let insight = "";

        try {

            insight =
                await generateInsight(
                    query,
                    analytics
                );

        } catch {

            insight =
                "Insight generation failed.";
        }

        // FINAL RESPONSE
        res.json({

            plan,

            analytics,

            chartType:
                plan.chart_type,

            insight
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({

            error:
                error.message
                ||
                "Internal server error"
        });
    }
});

module.exports = router;