
import streamlit as st
import json
import tempfile
from pathlib import Path

from vulnerability_detector import analyze_source
from report_generator import write_sarif_report

st.set_page_config(
    page_title="AST Security Analyzer",
    page_icon="🔐",
    layout="wide"
)

st.title("🔐 AST-Based Security Analyzer")
st.write(
    "A Python Static Application Security Testing tool "
    "using AST analysis and taint tracking."
)

st.markdown("---")

uploaded_file = st.file_uploader(
    "Upload a Python source file",
    type=["py"]
)

if uploaded_file is not None:

    source_code = uploaded_file.getvalue().decode("utf-8")

    st.subheader("Uploaded Python Code")
    st.code(source_code, language="python")

    if st.button("🔍 Analyze Code", type="primary"):

        try:
            with st.spinner("Analyzing your code..."):

                findings = analyze_source(
                    source_code,
                    filename=uploaded_file.name
                )

            st.subheader("Security Analysis Results")

            if findings:
                st.error(
                    f"Found {len(findings)} potential security issue(s)."
                )

                for finding in findings:
                    rule = finding.get("rule_id", "Unknown Rule")
                    severity = finding.get("severity", "Unknown")
                    line = finding.get("line", "Unknown")

                    with st.expander(
                        f"{rule} | {severity} | Line {line}"
                    ):
                        st.write(
                            "**Description:**",
                            finding.get("message", "No description available")
                        )

                        st.json(finding)

            else:
                st.success("No security issues detected!")

            json_report = json.dumps(
                {"findings": findings},
                indent=4
            )

            st.download_button(
                label="⬇️ Download JSON Report",
                data=json_report,
                file_name="security_report.json",
                mime="application/json"
            )

            with tempfile.TemporaryDirectory() as temp_dir:

                sarif_path = Path(temp_dir) / "security_report.sarif"

                write_sarif_report(findings, sarif_path)

                sarif_data = sarif_path.read_text(encoding="utf-8")

            st.download_button(
                label="⬇️ Download SARIF Report",
                data=sarif_data,
                file_name="security_report.sarif",
                mime="application/json"
            )

        except UnicodeDecodeError:
            st.error("The uploaded file must contain valid UTF-8 text.")

        except SyntaxError as error:
            st.error(f"Python syntax error: {error}")

        except Exception as error:
            st.error(f"Analysis failed: {error}")

st.markdown("---")

st.caption(
    "P15 | Compiler Design 2026–27 | "
    "AST-Based Security Analyzer with Taint Tracking"
)
