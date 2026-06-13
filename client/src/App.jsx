import { useState } from "react";

import Header from "./components/Header";
import UploadSection from "./components/UploadSection";
import QuerySection from "./components/QuerySection";
import ChartRenderer from "./components/ChartRenderer";
import InsightCard from "./components/InsightCard";
import ErrorCard from "./components/ErrorCard";

import "./styles/app.css";

function App() {

    const [file, setFile] = useState(null);

    const [schema, setSchema] = useState([]);

    const [query, setQuery] = useState("");

    const [response, setResponse] = useState(null);

    const [loading, setLoading] = useState(false);

    const [loadingText, setLoadingText] =
        useState("Analyzing dataset...");

    const [queryHistory, setQueryHistory] =
        useState([]);

    // ==========================================
    // HANDLE UPLOAD
    // ==========================================

    const handleUpload = async () => {

        if (!file) {
            return alert("Please select a CSV file");
        }

        try {

            setLoading(true);

            setLoadingText(
                "Uploading dataset..."
            );

            const formData = new FormData();

            formData.append(
                "file",
                file
            );

            const res = await fetch(
                "https://ai-analyst-1-rqou.onrender.com/upload",
                {
                    method: "POST",
                    body: formData
                }
            );

            const data = await res.json();

            setSchema(data.schema);

            alert(
                "CSV Uploaded Successfully"
            );

        } catch (error) {

            console.log(error);

            alert("Upload Failed");

        } finally {

            setLoading(false);
        }
    };

    // ==========================================
    // HANDLE ASK
    // ==========================================

    const handleAsk = async () => {

        if (!query.trim()) {
            return;
        }

        try {

            setLoading(true);

            setLoadingText(
                "Understanding your query..."
            );

            setTimeout(() => {

                setLoadingText(
                    "Analyzing dataset..."
                );

            }, 1200);

            setTimeout(() => {

                setLoadingText(
                    "Generating AI insights..."
                );

            }, 2500);

            const res = await fetch(
                "https://ai-analyst-1-rqou.onrender.com/ask",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                        "application/json"
                    },

                    body: JSON.stringify({

                        query,

                        schema
                    })
                }
            );

            const data = await res.json();

            console.log(data);

            setResponse(data);

            // SAVE QUERY HISTORY
            setQueryHistory(prev => [

                query,

                ...prev.slice(0, 4)
            ]);

        } catch (error) {

            console.log(error);

            setResponse({

                error:
                "Something went wrong"
            });

        } finally {

            setLoading(false);
        }
    };

    return (

        <div className="app-shell">

            {/* SIDEBAR */}

            <aside className="sidebar">

                <div className="sidebar-top">

                    <Header />

                    <div className="section-card">

                        <h3 className="section-heading">
                            Upload Dataset
                        </h3>

                        <UploadSection
                            setFile={setFile}
                            handleUpload={handleUpload}
                        />

                    </div>

                    <div className="section-card">

                        <h3 className="section-heading">
                            Ask AI
                        </h3>

                        <QuerySection
                            query={query}
                            setQuery={setQuery}
                            handleAsk={handleAsk}
                            loading={loading}
                        />

                    </div>

                    {/* DATASET INFO */}

                    {
                        schema.length > 0 && (

                            <div className="section-card">

                                <h3 className="section-heading">
                                    Dataset Info
                                </h3>

                                <p className="dataset-text">
                                    Columns Detected:
                                </p>

                                <div className="schema-tags">

                                    {
                                        schema.map(
                                            (
                                                col,
                                                index
                                            ) => (

                                                <span
                                                    key={index}
                                                    className="schema-tag"
                                                >
                                                    {col.name}
                                                </span>
                                            )
                                        )
                                    }

                                </div>

                            </div>
                        )
                    }

                    {/* QUERY HISTORY */}

                    {
                        queryHistory.length > 0 && (

                            <div className="section-card">

                                <h3 className="section-heading">
                                    Recent Queries
                                </h3>

                                <div className="history-list">

                                    {
                                        queryHistory.map(
                                            (
                                                item,
                                                index
                                            ) => (

                                                <div
                                                    key={index}
                                                    className="history-item"
                                                >
                                                    {item}
                                                </div>
                                            )
                                        )
                                    }

                                </div>

                            </div>
                        )
                    }

                </div>

            </aside>

            {/* MAIN CONTENT */}

            <main className="main-content">

                {/* EMPTY STATE */}

                {
                    !response && !loading && (

                        <div className="empty-state">

                            <h2>
                                AI-Powered Analytics
                            </h2>

                            <p>
                                Upload any CSV and ask
                                natural language questions.
                            </p>

                            <div className="sample-questions">

                                <div>
                                    show sales trend
                                </div>

                                <div>
                                    top 10 repositories by stars
                                </div>

                                <div>
                                    average rainfall
                                </div>

                            </div>

                        </div>
                    )
                }

                {/* ERROR */}

                {
                    response?.error && (

                        <ErrorCard
                            error={response.error}
                        />
                    )
                }

                {/* CHART */}

                {
                    response?.analytics?.chartData && (

                        <div className="chart-container">

                            <div className="analytics-header">

                                <h2 className="chart-title">
                                    Analytics Dashboard
                                </h2>

                                <span className="chart-badge">
                                    {response.chartType}
                                </span>

                            </div>

                            <ChartRenderer
                                response={response}
                            />

                        </div>
                    )
                }

                {/* INSIGHT */}

                {
                    response?.insight && (

                        <InsightCard
                            insight={response.insight}
                        />
                    )
                }

            </main>

            {/* FULLSCREEN LOADING */}

            {
                loading && (

                    <div className="loading-overlay">

                        <div className="loading-modal">

                            <div className="loading-spinner"></div>

                            <h2>
                                AI Data Analyst
                            </h2>

                            <p>
                                {loadingText}
                            </p>

                        </div>

                    </div>
                )
            }

        </div>
    );
}

export default App;