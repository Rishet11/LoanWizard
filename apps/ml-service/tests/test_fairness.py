"""Fairness harness — four-fifths rule across employment and age buckets."""
import pytest

from app.schemas import FormData, CVSignalsSummary
from app.services.policy_engine import PolicyEngine
from app.services.risk_scorer import RiskScorer
from app.services.persona_classifier import PersonaClassifier
from app.services.offer_builder import OfferBuilder
from app.services.bureau_mock import BureauMock

GOOD_CV = CVSignalsSummary(avg_age_estimate=30.0, avg_liveness=0.93, min_liveness=0.8, face_present_ratio=0.97)

policy = PolicyEngine()
risk_scorer = RiskScorer()
risk_scorer.load()
persona_clf = PersonaClassifier()
persona_clf.load()
offer_builder = OfferBuilder()
bureau = BureauMock()


def _run(form: FormData) -> bool:
    bureau_data = bureau.get(form.name or "x")
    pol = policy.evaluate(form, GOOD_CV, bureau_data)
    risk = risk_scorer.score(form, GOOD_CV, bureau_data)
    persona = persona_clf.classify(form, bureau_data)
    offer = offer_builder.build("fairness_test", form, pol, risk, persona)
    return offer.eligible


@pytest.fixture(scope="module")
def cohort_results():
    """Build a 200-customer synthetic cohort stratified by emp × age × income."""
    emp_types = ["salaried", "self_employed", "business_owner", "unemployed", "retired"]
    age_buckets = [(21, 30), (31, 45), (46, 65)]
    incomes = [25_000, 50_000, 80_000, 150_000]

    by_emp: dict[str, list[bool]] = {e: [] for e in emp_types}
    by_age: dict[str, list[bool]] = {}

    for emp in emp_types:
        for income in incomes:
            for age_lo, age_hi in age_buckets:
                age = (age_lo + age_hi) // 2
                bucket = f"{age_lo}-{age_hi}"
                if bucket not in by_age:
                    by_age[bucket] = []

                form = FormData(
                    name=f"test_{emp}_{income}_{age}",
                    employment_type=emp,
                    monthly_income=float(income),
                    loan_amount_requested=float(income * 8),
                    purpose="home",
                    declared_age=age,
                )
                eligible = _run(form)
                by_emp[emp].append(eligible)
                by_age[bucket].append(eligible)

    return by_emp, by_age


def test_four_fifths_rule_by_employment(cohort_results):
    by_emp, _ = cohort_results
    rates = {e: sum(v) / len(v) for e, v in by_emp.items() if v}
    # Only compare groups with non-trivial approval (unemployed is expected very low)
    comparable = {k: v for k, v in rates.items() if k != "unemployed"}
    if not comparable:
        pytest.skip("no comparable groups")
    max_rate = max(comparable.values())
    min_rate = min(comparable.values())
    if max_rate > 0:
        ratio = min_rate / max_rate
        assert ratio >= 0.8, (
            f"Disparate impact violation: {min_rate:.2f}/{max_rate:.2f} = {ratio:.2f} < 0.8\n"
            f"Rates: {comparable}"
        )


def test_four_fifths_rule_by_age(cohort_results):
    _, by_age = cohort_results
    rates = {b: sum(v) / len(v) for b, v in by_age.items() if v}
    max_rate = max(rates.values())
    min_rate = min(rates.values())
    if max_rate > 0:
        ratio = min_rate / max_rate
        assert ratio >= 0.8, (
            f"Age-bucket disparate impact: {ratio:.2f} < 0.8\nRates: {rates}"
        )


def test_salaried_higher_approval_than_unemployed_at_low_income():
    """Unemployed applicants at subsistence income should be rejected; salaried approved."""
    low_income = 12_000.0  # below ₹15k threshold
    unemp = FormData(name="low_unemp", employment_type="unemployed", monthly_income=low_income,
                     loan_amount_requested=100_000, declared_age=30)
    sal = FormData(name="low_sal", employment_type="salaried", monthly_income=20_000.0,
                   loan_amount_requested=100_000, declared_age=30)
    assert _run(unemp) is False, "Unemployed with sub-threshold income must be rejected"
    assert _run(sal) is True, "Salaried with income above threshold must be approved"


def test_no_eligible_customers_with_zero_income(cohort_results):
    form = FormData(name="zero_income", employment_type="unemployed", monthly_income=0.0, loan_amount_requested=100_000, declared_age=30)
    assert _run(form) is False


def test_prime_age_bracket_has_positive_approval(cohort_results):
    _, by_age = cohort_results
    rate = sum(by_age["31-45"]) / len(by_age["31-45"])
    assert rate > 0.3, f"Prime-age bracket should approve >30% of creditworthy applicants, got {rate:.2f}"
