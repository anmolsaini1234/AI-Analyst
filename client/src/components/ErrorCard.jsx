function ErrorCard({ error }) {

    if (!error) {
        return null;
    }

    return (

        <div className="error-card">

            <div className="error-header">

                <div className="error-icon">
                    ⚠️
                </div>

                <div>

                    <h3>
                        Something Went Wrong
                    </h3>

                    <p>
                        AI analysis could not be completed
                    </p>

                </div>

            </div>

            <div className="error-message">

                {error}

            </div>

        </div>
    );
}

export default ErrorCard;