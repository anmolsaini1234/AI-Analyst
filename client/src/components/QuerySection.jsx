function QuerySection({

    query,
    setQuery,
    handleAsk,
    loading

}) {

    return (

        <div className="query-section">

            <div className="query-input-wrapper">

                <textarea

                    placeholder="
Ask anything about your dataset...

Examples:
• show sales trend
• top 10 repositories by stars
• average rainfall
                    "

                    value={query}

                    onChange={(e) =>
                        setQuery(
                            e.target.value
                        )
                    }

                    className="query-textarea"
                />

            </div>

            <button
                onClick={handleAsk}
                disabled={loading}
                className="ask-btn"
            >

                {
                    loading
                        ? "Analyzing Dataset..."
                        : "Ask AI"
                }

            </button>

        </div>
    );
}

export default QuerySection;