# Massachusetts RMV curation record
Supports [#123](https://github.com/egohygiene/akashic/issues/123), the [canonical chapter](ma-rmv.md), and the [reusable contract](../civic-tasks.md).
## Scope and source verification
Public source content checked by the authoring agent on **2026-09-27**; human truth review remains pending. No private transaction, authenticated portal, appointment booking, payment, or submission was performed. The public instruction pages were retrieved directly with HTTP 200 and read. Search-service attempts to open Mass.gov returned 403; direct public retrieval succeeded. The Secretary of the Commonwealth page was not fully retrievable, so the chapter does not rely on it to resolve the voter-registration conflict.
Canonical home: public RMV references in Public Services; operational task prose in `docs/civic/ma-rmv.md`; explicit editorial links from Massachusetts Atlas. No resource migration, ID change, new collection, inferred Atlas applicability, or copied per-city workflow. Five new reference entries increase Public Services from 121 to 126 and the catalog from 5,367 to 5,372. The existing 147 Atlas resource records are unchanged.
The free-access metadata describes reading the reference page, not the cost or account requirements of a transaction. Those are separate, source-linked fields in each task. Public examples contain no license numbers, addresses, SSNs, health records, or forms.
## Evidence map
The live page is the canonical transaction entry point, even when its form or authenticated portal changes. Estimates below are in the task cards, attributed to the corresponding page; no universal processing-time guarantee is inferred.
| Public source | Coverage |
| --- | --- |
| [address](https://www.mass.gov/how-to/change-your-address-with-the-rmv) | Residential/mailing record, address deadline, replacement distinction, insurer/assessor follow-through, and voter-address wording. |
| [change](https://www.mass.gov/how-to/change-information-on-your-drivers-license-or-id-card) | Address versus card, name amendment, appointment route, credential-specific evidence and amendment fee. |
| [license](https://www.mass.gov/how-to/replace-your-drivers-license) | License replacement fee, MyMassGov/telephone/AAA restrictions, delivery and follow-up; not a general interim driving authorization. |
| [id](https://www.mass.gov/how-to/replace-your-massachusetts-id-card) | Separate Mass ID replacement fee, channels, delivery and follow-up. |
| [renew-license](https://www.mass.gov/how-to/renew-your-real-or-standard-passenger-class-d-or-motorcycle-class-m-drivers-license) | Class D/M/DM renewal, holds, limited-term exceptions, fee and mailing. |
| [renew-id](https://www.mass.gov/how-to/renew-your-real-or-standard-massachusetts-id-mass-id) | Full-term/limited-term ID renewal and REAL ID upgrade distinction. Redirect resolved to the canonical REAL-or-Standard URL. |
| [real-id](https://www.mass.gov/info-details/real-id-in-massachusetts) | Credential choice, document checklist, in-person verification, fee distinctions, and TSA rejection of temporary paper REAL ID. |
| [donor](https://www.mass.gov/how-to/register-as-an-organ-donor-at-the-rmv) | Registry versus card symbol, enrollment/unenrollment, optional replacement and renewal reconfirmation. |
| [registration-address](https://www.mass.gov/how-to/change-information-on-your-vehicle-registration) | Address-only versus other amendments, insurance/owner evidence, duplicate option. |
| [registration](https://www.mass.gov/how-to/replace-your-vehicle-registration-or-plate-decal) | Registration/decal replacement, immediate printable registration, fee and mail estimate. |
| [renew-registration](https://www.mass.gov/how-to/renew-your-vehicle-or-trailer-registration) | Insurance/holds, channels, plate-dependent fees and separate mailing estimate. |
| [replace-title](https://www.mass.gov/how-to/replace-your-vehicles-certificate-of-title) | Duplicate title, lien/deceased-owner/damaged-title exceptions, fee and delivery. |
| [new-license](https://www.mass.gov/how-to/transfer-your-real-or-standard-out-of-state-drivers-or-motorcycle-license-to-massachusetts) | Online preparation versus required visit, credential-specific evidence and out-of-state conversion. |
| [new-registration](https://www.mass.gov/how-to/transfer-your-registration-and-title-from-out-of-state) | No residency grace period, insurance/title/tax requirements, inspection and mailing. |
| [cancel](https://www.mass.gov/how-to/cancel-your-vehicle-registration-license-plates) | Single/two-owner routes, cancellation receipt, driving restriction, insurer and separate abatement. |
| [plates](https://www.mass.gov/how-to/order-replacement-vehicle-license-plates) | Missing/damaged versus reported stolen, single/both plate restrictions, exemptions and Plate Permit. |
| [disability](https://www.mass.gov/how-to/apply-for-a-disability-placard-or-license-plate) | Provider-certified application, Medical Affairs mail route, placard/plate fees and processing. |
| [reinstate](https://www.mass.gov/how-to/reinstate-your-drivers-license) | Case-specific requirements, fees, exams and conditional online payment. |
| [permit](https://www.mass.gov/how-to/apply-for-a-passenger-class-d-learners-permit) | Class D application, age/consent, exams/accommodations and permit fee. |
| [road-test](https://www.mass.gov/how-to/schedule-your-road-test) | Scheduling, sponsor/vehicle requirements, fee and conditional license issuance. |
| [excise](https://www.mass.gov/guides/motor-vehicle-excise) | Assessor/collector roles, in-state versus out-of-state moves, evidence, abatement and ongoing collection. |
| [help](https://www.mass.gov/info-details/ask-the-rmv) | Task-specific contact, access, appointment and processing-delay escalation. |
| [fees](https://www.mass.gov/info-details/massachusetts-registry-of-motor-vehicles-fees) | Fee schedule gateway and stated exemptions; numerical task fees are also checked on transaction pages. |
| [buy-vehicle](https://www.mass.gov/how-to/apply-for-a-registration-and-title-for-a-vehicle-purchased-from-an-individual) | Private purchase evidence, title/tax/registration, inspection and title delivery; routes to exceptions. |
| [correct-title](https://www.mass.gov/how-to/change-information-on-your-vehicle-title) | Correction versus ownership transfer, original evidence, fee, lienholder mailing. |
| [voter-rmv](https://www.mass.gov/info-details/automatic-voter-registration) | Licensing-application opt-out removal and municipal follow-up; does not silently resolve address-page wording. |
| [voter-news](https://www.mass.gov/news/votes-act-requires-massachusetts-registry-of-motor-vehicles-to-remove-option-for-customers-to-opt-out-of-automatic-voter-registration) | 2023 VOTES Act change corroborates the automatic-registration page. |
| [irs](https://www.irs.gov/faqs/irs-procedures/address-changes/address-changes) | Direct federal address update and USPS-forwarding limitation. |
| [usps](https://www.usps.com/manage/forward.htm) | Official mail-forwarding route; public HTML inspected separately because it has no main element. |
| [Massachusetts DOR](https://www.mass.gov/orgs/massachusetts-department-of-revenue) | Official tax/account/contact gateway retrieved and checked separately for state-tax follow-through. |

## Conflicts and limits retained
- The address-change page describes a voter-address opt-out choice; the automatic-registration page describes removal of the licensing-application opt-out. The checklist presents both scopes and routes the unresolved case to the local election office. It does not promise that a checkbox exists, that a person is eligible to vote, or that registration is complete.
- The road-test page contains broad identity wording that could be read beyond the current Standard-license rules. The task links to the current document path and does not reproduce that wording as a universal eligibility rule.
- A lost-license order, renewal payment, title receipt, disability application, or abatement application is not interchangeable with a valid credential, approval, driving privilege, or corrected tax bill. Cards explicitly separate these checkpoints.
- Insurer and municipal channels/costs depend on the actual provider and town. Those cards direct readers to confirm local routes rather than supply invented statewide forms or fees.
- Unknown fees and case-dependent timing are labeled as such. Do not use the 30-day RMV address-update deadline for a new resident’s vehicle registration: the official transfer page states there is no grace period.
- Review the chapter by **2026-10-27**, earlier for changed fees/forms/eligibility/channels, source disagreement, or a reader report. An HTTP check does not reset the content-verification date or create human review.

## Editorial derivatives
Future article: **Changing Your Address Is Not the Same as Replacing Your ID**. Use the record → optional duplicate → registration → insurer → assessor sequence, link back to the canonical chapter, recheck facts, and omit all personal cases or identifying details. An infographic can illustrate Find → Verify → Prepare → Submit → Save → Track → Escalate; it must not label submission as completion. These are briefs, not published derivatives.
