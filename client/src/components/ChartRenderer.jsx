import {

    LineChart,
    Line,

    BarChart,
    Bar,

    PieChart,
    Pie,

    ScatterChart,
    Scatter,

    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer

} from "recharts";

import KpiCard from "./KpiCard";

function ChartRenderer({ response }) {

    if (!response?.analytics?.chartData) {
        return null;
    }

    const data =
        response.analytics.chartData;

    const chartType =
        response.chartType;

    // EMPTY DATA
    if (!data.length) {

        return (

            <div
                style={{
                    padding: "20px",
                    fontSize: "18px"
                }}
            >
                No data available
            </div>
        );
    }

    const sample =
        data[0];

    const keys =
        Object.keys(sample);

    // =====================================
    // USE PLAN VALUES FIRST
    // =====================================

    let categoryKey =
        response?.plan?.group_by;

    let numericKey =
        response?.plan?.metric;

    // =====================================
    // FALLBACK AUTO DETECTION
    // =====================================

    if (!categoryKey || !numericKey) {

        const numericKeys =
            keys.filter(
                key =>
                    typeof sample[key]
                    === "number"
            );

        // CATEGORY KEY
        categoryKey =
            categoryKey
            ||
            keys.find(
                key =>
                    typeof sample[key]
                    === "string"
            );

        // NUMERIC KEY
        numericKey =
            numericKey
            ||
            numericKeys.find(
                key =>
                    key !== categoryKey
            );
    }

    // =====================================
    // FIX COUNT OPERATION
    // =====================================

    if (
        response?.plan?.operation
        === "count"
    ) {

        const possibleCountKey =
            keys.find(
                key =>
                    key.toLowerCase() === "count"
            );

        if (possibleCountKey) {
            numericKey = possibleCountKey;
        }
    }

    // =====================================
    // FIX INVALID KEYS
    // =====================================

    if (!keys.includes(numericKey)) {

        numericKey =
            keys.find(
                key =>
                    typeof sample[key]
                    === "number"
            );
    }

    if (
        !keys.includes(categoryKey)
        ||
        categoryKey === numericKey
    ) {

        categoryKey =
            keys.find(
                key =>
                    key !== numericKey
            );
    }

    // =====================================
    // SINGLE VALUE DETECTION
    // =====================================

    const isSingleValue =
        data.length === 1;

    // =====================================
    // KPI CARD
    // =====================================

    if (isSingleValue) {

        return (

            <KpiCard
                title={
                    response?.plan?.operation
                        ?.replaceAll("_", " ")
                        .toUpperCase()
                    ||
                    numericKey
                }

                value={
                    data[0][numericKey]
                        ?.toFixed?.(2)
                    ||
                    data[0][numericKey]
                }
            />
        );
    }

    // =====================================
    // LINE CHART
    // =====================================

    if (chartType === "line") {

        return (

            <ResponsiveContainer
                width="100%"
                height={400}
            >

                <LineChart data={data}>

                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis dataKey={categoryKey} />

                    <YAxis />

                    <Tooltip />

                    <Line
                        type="monotone"
                        dataKey={numericKey}
                        stroke="#2563eb"
                        strokeWidth={3}
                    />

                </LineChart>

            </ResponsiveContainer>
        );
    }

    // =====================================
    // BAR CHART
    // =====================================

    if (chartType === "bar") {

        return (

            <ResponsiveContainer
                width="100%"
                height={400}
            >

                <BarChart data={data}>

                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis dataKey={categoryKey} />

                    <YAxis />

                    <Tooltip />

                    <Bar
                        dataKey={numericKey}
                        fill="#3b82f6"
                        radius={[8, 8, 0, 0]}
                    />

                </BarChart>

            </ResponsiveContainer>
        );
    }

    // =====================================
    // PIE CHART
    // =====================================

    if (chartType === "pie") {

        return (

            <ResponsiveContainer
                width="100%"
                height={400}
            >

                <PieChart>

                    <Pie
                        data={data}
                        dataKey={numericKey}
                        nameKey={categoryKey}
                        outerRadius={150}
                        fill="#8884d8"
                        label
                    />

                    <Tooltip />

                </PieChart>

            </ResponsiveContainer>
        );
    }

    // =====================================
    // SCATTER CHART
    // =====================================

    if (chartType === "scatter") {

        return (

            <ResponsiveContainer
                width="100%"
                height={400}
            >

                <ScatterChart>

                    <CartesianGrid />

                    <XAxis dataKey={categoryKey} />

                    <YAxis dataKey={numericKey} />

                    <Tooltip />

                    <Scatter
                        data={data}
                        fill="#0ea5e9"
                    />

                </ScatterChart>

            </ResponsiveContainer>
        );
    }

    // =====================================
    // FALLBACK BAR CHART
    // =====================================

    return (

        <ResponsiveContainer
            width="100%"
            height={400}
        >

            <BarChart data={data}>

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey={categoryKey} />

                <YAxis />

                <Tooltip />

                <Bar
                    dataKey={numericKey}
                    fill="#3b82f6"
                />

            </BarChart>

        </ResponsiveContainer>
    );
}

export default ChartRenderer;