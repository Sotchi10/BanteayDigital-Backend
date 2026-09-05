# 29. Multimodal AI and QR Code Architecture Add-On

This section records the finalized AI architecture decision for the Banteay Digital MVP.

## 29.1 Final AI Architecture Decision

For the MVP, Banteay Digital should use **one capable multimodal Large Language Model (LLM)** as the primary AI intelligence layer.

The same model should be capable of accepting and analyzing multiple input types, including:

- Text
- URLs and accompanying context
- Images
- Screenshots
- Visual scam advertisements
- Social media posts
- QR code images

The recommended approach is:

```text
                    USER INPUT
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
      TEXT             IMAGE           QR CODE
        │                │                │
        └────────────────┼────────────────┘
                         │
                         ▼
              MULTIMODAL LLM
         (Vision + Language + Reasoning)
                         │
                         ▼
              SCAM RISK ANALYSIS
                         │
                         ▼
              STRUCTURED JSON RESULT
                         │
                         ▼
                   BACKEND + UI
```

### Why One Multimodal Model Is Recommended

The MVP should **not initially use two separate LLMs**, such as:

```text
Image
  ↓
Vision LLM
  ↓
Image Description / Extracted Context
  ↓
Analysis LLM
  ↓
Final Result
```

Although a multi-model pipeline can be useful in larger production systems, it introduces additional complexity:

- Multiple API integrations
- Additional prompts and prompt maintenance
- Passing outputs between models
- Increased latency
- More failure points
- More difficult debugging
- Potentially higher cost
- More development time

For the current MVP timeline, these disadvantages outweigh the potential benefits.

A modern multimodal model can directly:

1. Understand visual content.
2. Read visible text within an image.
3. Understand contextual relationships.
4. Identify suspicious behavior and scam patterns.
5. Reason about potential fraud.
6. Generate a structured scam analysis.

Therefore, a single multimodal model provides a simpler and more suitable architecture for the initial version of Banteay Digital.

---

## 29.2 Recommended Input Handling

### Text Input

```text
User Text
    ↓
Multimodal LLM
    ↓
Scam Analysis
    ↓
Structured Result
```

### Image and Screenshot Input

```text
User Image / Screenshot
          ↓
    Multimodal LLM
          ↓
Visual + Context Analysis
          ↓
    Scam Risk Assessment
          ↓
     Structured Result
```

The model should analyze the complete context of the image rather than requiring a separate LLM to first describe the image.

For example, a screenshot may contain:

- Conversation messages
- Fake company branding
- Payment instructions
- Urgency tactics
- Suspicious links
- Impersonation attempts
- Unrealistic offers

A multimodal model can analyze the relationship between these elements in a single request.

---

## 29.3 QR Code Handling

QR codes require special consideration.

For the MVP, a vision-capable multimodal model may analyze a QR code image together with its surrounding visual context.

```text
QR Code Image
      ↓
Multimodal LLM
      ↓
Visual + Contextual Analysis
      ↓
Scam Risk Assessment
```

However, an LLM should not be assumed to reliably decode the exact hidden data from every arbitrary QR code.

If the system requirement is specifically:

> "Determine whether the visual QR code and its surrounding context appear suspicious."

Then the multimodal model can perform the initial analysis.

If the requirement is:

> "Decode the exact URL or data inside the QR code and analyze the destination."

Then a dedicated QR decoding library or service is more appropriate.

### Recommended Future QR Architecture

```text
QR Image
   │
   ├──────────────► QR Decoder
   │                    │
   │                    ▼
   │             Extracted URL/Data
   │                    │
   └────────────────────┼──────────────┐
                        │              │
                        ▼              ▼
                Multimodal Context   LLM Analysis
                     Analysis              │
                        └──────────┬───────┘
                                   ▼
                         Final Structured Result
```

A QR decoder is not a second LLM and is not part of the removed rule-based scam detection architecture. Its purpose is deterministic extraction of encoded QR data.

For example:

```text
QR Code
   ↓
QR Decoder
   ↓
https://example-suspicious-site.com/login
   ↓
LLM analyzes the extracted content and context
   ↓
Scam Risk Result
```

### MVP Decision

For the current MVP:

- QR code support may initially rely on the multimodal model's visual analysis.
- Exact QR payload decoding can remain a future enhancement if development time is limited.
- If exact URL extraction becomes necessary, add a lightweight QR decoder rather than another LLM.

---

## 29.4 AI Model Selection Principles

The final provider and model should be selected based on practical testing rather than popularity alone.

Evaluation criteria should include:

| Criterion | Importance |
| :--- | :--- |
| Multimodal / vision capability | Essential |
| Cost per request | High |
| Scam analysis quality | Essential |
| Image understanding | Essential |
| Structured JSON reliability | High |
| Response latency | High |
| API integration simplicity | High |
| Context window | Medium |
| Model availability and rate limits | Medium |

Potential categories of models to evaluate include:

- Low-cost multimodal Gemini models
- OpenAI multimodal mini/nano models
- Other affordable vision-capable API models

The final model should be benchmarked using the project's own representative dataset.

---

## 29.5 Recommended Model Evaluation Strategy

Instead of choosing a model only based on published benchmarks, test candidate models using realistic Banteay Digital inputs.

Suggested test dataset:

- Legitimate messages
- Scam SMS messages
- Phishing messages
- Fake job offers
- Investment scams
- Fake prize notifications
- Social media scam posts
- Scam conversation screenshots
- Legitimate screenshots
- QR code examples

Each model should receive the same prompt and evaluation criteria.

Measure:

- Scam detection accuracy
- False positives
- False negatives
- Correct scam category
- Quality of explanation
- Structured JSON consistency
- Response latency
- Approximate API cost

### Important Consideration

For a scam detection system, the project should pay particular attention to:

- **False positives:** Legitimate content incorrectly marked as a scam.
- **False negatives:** Scam content incorrectly considered safe.

Model quality should therefore be evaluated using real project scenarios rather than intelligence benchmarks alone.

---

## 29.6 Updated AI Service Architecture

The AI service should be designed around a single primary multimodal model for the MVP.

```text
React Frontend
      │
      ▼
Express Backend
      │
      ▼
Python AI Service
      │
      ├── Text Input
      ├── URL Input
      ├── Image Input
      └── QR Image Input
              │
              ▼
       Multimodal LLM API
              │
              ▼
      Structured JSON Response
              │
              ▼
        Express Backend
              │
              ▼
          MySQL Storage
              │
              ▼
          User Interface
```

This design keeps AI integration centralized while allowing future expansion.

Future versions can introduce:

- QR decoding before LLM analysis
- Multiple model providers
- Fallback models
- Consensus between models
- Specialized extraction models
- RAG using verified historical scam reports

These improvements should not be required for the initial MVP.

---

## 29.7 Updated AI Prompting Considerations

The AI prompt should explicitly tell the model to handle multimodal input.

The analysis instructions should consider:

1. Visible textual content.
2. Visual context.
3. Conversation context.
4. Suspicious links or instructions.
5. Impersonation indicators.
6. Financial requests.
7. Urgency and pressure tactics.
8. Unrealistic promises.
9. Requests for sensitive information.
10. QR code context when present.

Example conceptual instruction:

```text
You are an AI scam detection assistant.

Analyze the submitted content, including any textual and visual information provided.

For images and screenshots, consider:
- Visible text
- Visual context
- Conversation patterns
- Branding or impersonation indicators
- Payment requests
- Urgency or manipulation tactics
- Suspicious links and instructions

For QR code images, analyze the visible QR code and its surrounding context. Do not claim that the exact encoded destination has been decoded unless the system explicitly provides the decoded data.

Provide a risk assessment based on observable indicators.

Do not claim with absolute certainty that content is fraudulent.

Return only the required structured JSON format.
```

---

## 29.8 Final MVP Architecture Decision

The finalized recommendation for the current Banteay Digital MVP is:

```text
ONE PRIMARY MULTIMODAL LLM
            │
            ├── Text Analysis
            ├── URL + Context Analysis
            ├── Image Analysis
            ├── Screenshot Analysis
            └── QR Visual Analysis
                    │
                    ▼
           STRUCTURED AI RESULT
                    │
                    ▼
            USER + COMMUNITY FLOW
```

### Decision Summary

**Use one multimodal LLM for the MVP.**

Do not initially build:

```text
Vision LLM
    +
Separate Analysis LLM
```

unless future testing demonstrates a clear accuracy advantage that justifies the additional complexity.

For QR codes:

- Use multimodal visual analysis for the initial MVP when appropriate.
- Use a dedicated QR decoder in the future if exact encoded URL/data extraction is required.
- Do not use a second LLM solely for QR decoding.

This approach prioritizes:

- Faster development
- Lower architectural complexity
- Lower maintenance effort
- Reduced latency
- Simpler debugging
- Easier model replacement
- Better suitability for the current MVP timeline

---

## 29.9 Future Architecture Evolution

After the MVP is complete and sufficient test data is available, the AI pipeline can evolve into a more specialized architecture if needed:

```text
                 USER INPUT
                      │
                      ▼
              Input Classification
                      │
       ┌──────────────┼──────────────┐
       │              │              │
       ▼              ▼              ▼
     TEXT           IMAGE         QR CODE
       │              │              │
       │              ▼              ▼
       │        Multimodal LLM   QR Decoder
       │              │              │
       └──────────────┼──────────────┘
                      ▼
             Specialized AI Analysis
                      │
                      ▼
              Consensus / Decision
                      │
                      ▼
             Final Structured Result
```

This is a possible future optimization, not an MVP requirement.

---

# Appendix A — Changes Made in This Chat

The following information was added or clarified after the original handbook:

1. **Confirmed removal of OCR and rule-based scam detection from the MVP architecture.**
   - The AI system is now centered on LLM-based analysis rather than a traditional rule-based detection pipeline.

2. **Recommended using one primary multimodal LLM instead of two separate LLMs.**
   - One model handles both visual understanding and scam reasoning for images and screenshots.

3. **Clarified why a two-LLM pipeline is not recommended for the MVP.**
   - It increases complexity, latency, integration work, maintenance, and potential failure points.

4. **Defined the role of the multimodal model.**
   - The model can analyze text, images, screenshots, visual context, and suspicious content in a unified workflow.

5. **Added a finalized multimodal AI architecture.**
   - Multiple input types are routed through one primary multimodal AI service and return a standardized structured result.

6. **Clarified QR code handling.**
   - A multimodal model can analyze a QR code image and its visual context.
   - The model should not be assumed to reliably decode the exact hidden payload of every QR code.

7. **Added the recommended future QR decoding architecture.**
   - A dedicated QR decoder can extract exact URLs or data before sending them to the LLM for scam analysis.

8. **Clarified that a QR decoder is not a second LLM.**
   - It is a deterministic extraction component and does not conflict with the decision to avoid a multi-LLM pipeline.

9. **Added model selection criteria.**
   - Emphasis on multimodal capability, cost, scam-analysis quality, JSON reliability, latency, and integration simplicity.

10. **Added a project-specific model evaluation strategy.**
    - Candidate models should be tested against realistic scam and legitimate examples rather than selected only from public benchmarks.

11. **Updated prompting considerations for multimodal input.**
    - Prompts should explicitly instruct the model to analyze both visible text and visual context.

12. **Defined the final MVP recommendation.**
    - One primary multimodal LLM for text, images, screenshots, and initial QR visual analysis.
    - Specialized components can be introduced later only if testing and project requirements justify them.
