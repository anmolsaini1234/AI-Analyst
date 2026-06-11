const {
    GoogleGenerativeAI
} = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
);


// ==========================================
// GENERATE QUERY PLAN
// ==========================================

async function generateQueryPlan(
    query,
    schema
) {

    const model =
        genAI.getGenerativeModel({
            model: "gemini-2.5-flash"
        });

    const prompt = `
You are an advanced AI Data Analyst.

Your task:
Convert the user's natural language query into STRICT VALID JSON instructions.

You are NOT allowed to return explanations.
You MUST return ONLY raw valid parsable JSON.

--------------------------------------------------
DATASET SCHEMA:
${JSON.stringify(schema, null, 2)}
--------------------------------------------------

SUPPORTED OPERATIONS:

- trend_analysis
- max_value
- min_value
- average
- sum
- count
- top_n
- grouped_summary

--------------------------------------------------

SUPPORTED CHART TYPES:

- line
- bar
- pie
- scatter
- kpi
- table

--------------------------------------------------

CORE ANALYTICS RULES:

1. Use ONLY columns from schema.

2. Numeric columns:
- can be metrics
- cannot be group_by

3. Text/date columns:
- can be group_by
- cannot be metrics

4. Never use text columns as metrics.

5. Infer semantic meaning dynamically from:
- column names
- sample values
- data types
- user intent

Never assume fixed column names.

--------------------------------------------------

QUERY UNDERSTANDING RULES:

6. If user asks:
- highest
- maximum
- most
→ use "max_value"

7. If user asks:
- lowest
- minimum
→ use "min_value"

8. If user asks:
- average
- mean
→ use "average"

9. If user asks:
- total
- sum
→ use "sum"

10. If user asks:
- count
→ use "count"

11. If user asks:
- top
- ranking
- best
→ use "top_n"

12. If query includes:
"grouped by"
→ use "grouped_summary"

13. If query involves dates/time/trend:
→ prefer "trend_analysis"

--------------------------------------------------

FILTER RULES:

14. Detect filters from natural language.

Supported filters:
- greater_than
- less_than
- between
- equals

15. Examples:

"stars greater than 5000"

{
  "Stars": {
    "greater_than": 5000
  }
}

"between 2010 and 2020"

{
  "Year": {
    "between": [2010, 2020]
  }
}

--------------------------------------------------

CHART RULES:

16. Trend/time-series:
→ line chart

17. Category comparison:
→ bar chart

18. Scatter relationships:
→ scatter chart

19. Single aggregated values:
→ kpi chart

20. Large tabular outputs:
→ table

21. Never use pie charts for time-series.

--------------------------------------------------

GROUPING RULES:

22. For grouped_summary:
- metric MUST be numeric
- group_by MUST be categorical/date

23. For count operation:
- metric MUST be "*"
- NEVER use "count" as metric column

24. Example:

User Query:
"count repositories by language"

Correct Output:

{
  "operation": "count",
  "metric": "*",
  "group_by": "Language",
  "chart_type": "bar",
  "filters": {}
}

--------------------------------------------------

TOP N RULES:

25. For top_n:
- metric MUST be numeric
- sort_order = "desc"

26. If user specifies:
"top 5"
→ limit = 5

--------------------------------------------------

AMBIGUITY RULES:

27. If user intent is ambiguous:
choose safest valid interpretation.

28. Never hallucinate columns.

29. Never invent metrics.

30. Never return invalid JSON.

--------------------------------------------------

OUTPUT FORMAT:

{
  "operation": "",
  "metric": "",
  "group_by": "",
  "chart_type": "",
  "limit": 10,
  "sort_order": "desc",
  "filters": {}
}

--------------------------------------------------

USER QUERY:
${query}
`;

    const result =
        await model.generateContent(prompt);

    const response =
        result.response;

    let text =
        response.text();

    // REMOVE MARKDOWN IF GEMINI ADDS IT
    text = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

    return text;
}


// ==========================================
// GENERATE INSIGHT
// ==========================================

async function generateInsight(
    query,
    analyticsData
) {

    const model =
        genAI.getGenerativeModel({
            model: "gemini-2.5-flash"
        });

    const prompt = `
You are a professional senior data analyst.

Your task:
Generate concise professional insights
from analytics results.

--------------------------------------------------

USER QUERY:
${query}

--------------------------------------------------

ANALYTICS DATA:
${JSON.stringify(analyticsData)}

--------------------------------------------------

RULES:

1. Keep response under 100 words.

2. Mention:
- trends
- peaks
- declines
- anomalies
- comparisons
when relevant.

3. Avoid generic statements.

4. Be specific using actual values.

5. If data is empty:
state that no matching records were found.

6. Avoid repeating raw JSON.

7. Write like a real business analyst.

8. No markdown.

9. No bullet points.

10. Professional concise tone only.
`;

    const result =
        await model.generateContent(prompt);

    const response =
        result.response;

    return response.text().trim();
}


module.exports = {
    generateQueryPlan,
    generateInsight
};