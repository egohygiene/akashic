# Food access to meals: source and overlap audit

Issue [#148](https://github.com/egohygiene/akashic/issues/148) connects existing food assistance and cooking resources. This United States edition adds no catalog resources, recipe copies, eligibility calculator, private household records, or runtime dependencies. The one-meal worksheet is an original blank planning prompt; it does not prescribe a diet, price, or benefit outcome.

## Ownership and overlap

| Need | Canonical home and reuse decision |
| --- | --- |
| Assistance navigation | [Financial Relief and Assistance](../lists/financial-relief-and-assistance/README.md#food-access-to-meals) owns the route from food today to ongoing household, school, and older-adult nutrition support. Its existing [SNAP/EBT guide](../lists/financial-relief-and-assistance/README.md#snap-ebt-and-otc-benefits) from #111 retains program, payment, and purchase distinctions; #116's [Massachusetts follow-through](massachusetts-snap-follow-through.md) retains the state workflow. No copied eligibility table, thresholds, application, or renewal checklist. |
| Emergency and human help | [Public Services and Support](../lists/public-services-and-support/README.md#benefits-and-emergency-assistance) retains 211, Findhelp, USAGov emergency food, and TEFAP. Cross-link instead of duplicating broad gateways. |
| Community food and older-adult meals | [Awesome Abundance community resources](../lists/awesome-abundance/community-sharing-and-material-resources/README.md#food-and-household-essentials) retain Feeding America, FoodFinder, community meals, summer meals, and Meals on Wheels. A food-bank warehouse is not necessarily a walk-in distribution site. |
| School and public programs | [Awesome Abundance public programs](../lists/awesome-abundance/public-programs-and-services/README.md#food-and-nutrition) already has USDA School Meals (`usda-school-meals-cab17b90e4`). Its [health/family section](../lists/awesome-abundance/public-programs-and-services/README.md#health-and-family-programs) retains Eldercare Locator. USAGov school guidance supports the workflow without becoming a duplicate card. |
| Preparation and food safety | [Recipes, Cooking, and Food Data](../lists/recipes-cooking-and-food-data/README.md#from-food-access-to-a-meal) owns equipment/storage constraints, the obtain → store safely → prepare → stretch checklist, and the one-meal note. Existing affordable-cooking, allergy, safety, and preservation sections remain canonical. |
| Local context | [Atlas](../atlas/README.md) retains place-specific information. No new applicability association or inherited eligibility is inferred from geography. |

There are still 5,380 resources overall: Financial Relief 58, Recipes 55, and Community Sharing 45. Root and hub counts do not change. New `site-guide` prose is rendered by the existing guide renderer; Markdown remains the source of truth.

## Identity and corrections

Capture the generated ID before modifying a legacy entry. The two URL migrations preserve saved-resource identity and record the former address in `aliases`:

| Stable ID | Correction and evidence |
| --- | --- |
| `cooking-matters-recipe-finder-b4e71e3424` | The old `https://cookingmatters.org/recipe-finder/` returned 404. The Cooking Matters root leads to [The Food Trust partner portal](https://learning.thefoodtrust.org/for-nutrition-ed-partners/cooking-matters-partner-portal/), which states the 2024 acquisition and links its public [Recipe Explorer](https://learning.thefoodtrust.org/recipes/). Rename and replace the URL in place, preserving the old URL as an alias; remove obsolete Share Our Strength ownership and time/family filter claims. |
| `meals-on-wheels-america-find-meals-2c4c52a1e9` | The old `https://www.mealsonwheelsamerica.org/find-meals/` redirects to [Find Meals and Services](https://www.mealsonwheelsamerica.org/find-meals-and-services/). Keep its ID and former URL alias. Distinguish the free locator from local meal costs, assessment, capacity, and waiting lists. |

Materially checked cooking and safety entries receive explicit existing IDs and appropriate metadata. No `reviewed` date is added: an agent's source or link check is not a human truth review. No untouched SNAP/WIC or USDA resource is retimestamped.

## Assistance evidence

Primary public content inspected **2026-10-17**. A source's own publication/update date is separate from this retrieval date. Directory inspection does not verify individual local sites, inventory, appointments, accessibility, or enrollment.

| Primary source | Observed evidence and limits |
| --- | --- |
| [Feeding America food-bank locator](https://www.feedingamerica.org/find-your-local-foodbank) | Public ZIP search and partner-network route. Contact the bank or direct-service partner about actual distribution. No editorial update date visible. |
| [FoodFinder](https://foodfinder.us/) | Public locator landing page and contact/hours purpose readable. Embedded local results were not inspected; do not claim a local listing is current. |
| [211 food programs](https://www.211.org/get-help/food-programs-food-benefits) | Local food referrals and online/contact alternatives. No universal provider intake or document rule; local contact channels vary. |
| [USAGov emergency food](https://www.usa.gov/emergency-food-assistance) | Food banks, emergency programs, and 211 routes; page updated 2025-12-23. Do not reproduce hotline hours: official linked sources differed when checked. |
| [USAGov school meals](https://www.usa.gov/school-meals) | School breakfast/lunch and application routes; page updated 2025-12-23. Ask the district about current application or universal-meal arrangements, costs, schedules, and accommodations. Do not repeat a broad WIC-to-school-eligibility shortcut; the administering school/program decides. |
| [Meals on Wheels](https://www.mealsonwheelsamerica.org/find-meals-and-services/) | Current locator and guidance read. Local assessment/application/referral, area, demand, waiting lists, and free/donation/sliding-scale arrangements vary. |
| [Eldercare Locator](https://eldercare.acl.gov/) | Redirects to `/home`; public search, phone/text/chat, and meal/transport navigation readable. Feature modification date 2026-03-02 is not confirmation of local program availability. |

Canonical USDA `fns.usda.gov` and `fna.usda.gov` requests returned 403 during this audit; retain existing authored public government destinations and their existing check dates. USDA's production CDN supplied readable primary content below. This supports the guide's limited routing claims, not a new successful link check of the blocked canonical address.

| USDA primary content read through production CDN | Page date and use |
| --- | --- |
| [TEFAP applicant/recipient](https://fns-prod.azureedge.us/tefap/applicant-recipient), [fact sheet](https://fns-prod.azureedge.us/tefap/factsheet) | Updated 2026-05-29 and 2026-08-11. Take-home groceries and prepared meals have different program rules; avoid generalizing TEFAP's rules to every pantry. Guide asks the actual provider instead. |
| [WIC apply](https://fns-prod.azureedge.us/wic/apply), [contacts](https://fns-prod.azureedge.us/wic/program-contacts), [eligibility](https://fns-prod.azureedge.us/wic/eligibility) | Updated 2026-09-10, 2025-05-14, and 2026-09-16. Local category, residence, income, nutritional assessment, and appointment processes; screening does not enroll anyone. |
| [SNAP state directory](https://fns-prod.azureedge.us/snap/state-directory) | Updated 2025-01-30. Route to state administration; no copied current-year eligibility or purchase rules. Existing #111 warnings and source dates remain visible. |
| [Summer meal site finder](https://fns-prod.azureedge.us/sfsp/sitefinder) | Updated 2026-09-15. Seasonal operating dates and service mode must be confirmed. Map coverage is incomplete and excludes delivery sites; an empty search does not establish no help. |

The existing USDA School Meals `/cn` canonical page also could not be retrieved. School-office workflow is supported by the readable USAGov page above; no newly checked USDA School Meals metadata or new card is asserted.

## Preparation, safety, access, and reuse evidence

Primary pages inspected **2026-10-17**, without submitting applications, entering personal data, copying recipes, or using accounts.

| Primary source | Supports and boundary |
| --- | --- |
| [The Food Trust Recipe Explorer](https://learning.thefoodtrust.org/recipes/), [terms](https://thefoodtrust.org/terms-of-use/) | Public ingredient, meal-type, and dietary search without an account wall. Terms dated 2025-06-20 cover Cooking Matters/LearningHub and restrict copying, scraping, and other reuse. Link and factual description only; no recipe import or republication. Metadata says proprietary. |
| [EatFresh](https://eatfresh.org/find-a-recipe/), [terms](https://eatfresh.org/terms-and-conditions/) | Leah's Pantry public recipes and meal plans, Limited Kitchen, No-cook, time/ingredient/cuisine filters; free account for saving. Content is protected, not an open recipe dataset. A no-cook recipe can still need refrigeration, tools, and safe water. |
| [Food Hero](https://foodhero.org/healthy-recipes), [cookbook](https://foodhero.org/cookbook) | Oregon State University Extension short-preparation/limited-ingredient resources, English/Spanish downloads and basic-tool guidance. Public browsing; optional account features. No blanket reuse license verified, so license stays unknown. Cookbook is linked evidence within the existing resource, not a new card. |
| [Spend Smart. Eat Smart.](https://spendsmart.extension.iastate.edu/), [menu planning](https://spendsmart.extension.iastate.edu/plan/menu-planning/), [app information](https://spendsmart.extension.iastate.edu/about-app/) | Iowa State Extension inventory-first planning, unit prices, shopping, recipes, and waste guidance; public guidance without an account. All rights reserved. The original worksheet asks for one meal rather than requiring this source's five-day plan. No dollars-per-meal guarantee. |
| [Four Steps](https://www.foodsafety.gov/keep-food-safe/4-steps-to-food-safety) | Page reviewed 2023-09-18. Clean/separate/cook/chill, fridge at or below 40°F/4°C, perishables chilled within two hours or one hour above 90°F/32°C, prompt cooling in shallow containers. Transport time matters. |
| [Safe temperatures](https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures) | Reviewed 2024-11-21. Food-specific temperature/rest-time chart and thermometer use; no universal cooking temperature invented. |
| [Cold-food storage](https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts), [FoodKeeper](https://www.foodsafety.gov/keep-food-safe/foodkeeper-app) | Reviewed 2023-09-19 and 2019-04-26. Item-specific storage and freezing suitability; no single leftovers lifetime. FoodKeeper's browser requires JavaScript; individual tool records were not exercised. Existing list also retains USDA leftovers/freezing entries, whose canonical pages returned 403 and are not given fresh successful checks. |
| [FDA food allergies](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies), [FARE cross-contact](https://www.foodallergy.org/resources/avoiding-cross-contact) | Labels, ingredient verification, shared surfaces/tools, and limits of allergy tags. Cooking does not eliminate allergen cross-contact; no individual medical diet advice. |
| [Emergency food safety](https://www.foodsafety.gov/keep-food-safe/food-safety-in-disaster-or-emergency), [outage chart](https://www.foodsafety.gov/food-safety-charts/food-safety-during-power-outage) | Reviewed 2023-09-20 and 2024-08-08. Plan for limited water/cooking/refrigeration; never taste to determine safety. Appearance/odor cannot establish safe food after an outage. |

Public reading does not imply permission to copy recipes, photos, datasets, or instructions. Guide text summarizes limited safety facts and links to the primary instructions. An unopened shelf-stable item can require refrigeration after opening; labels and specific handling instructions control. Extra portions are useful only with safe cooling/storage and realistic energy, equipment, and transport.

## Review and verification

Assistance routing and the refreshed Meals on Wheels entry follow monthly review, next due **2026-11-17**. Preparation/source metadata follows quarterly review, next due **2027-01-17**. Recheck sooner for moved pages, safety changes/recalls, changed program rules, seasonal transitions, or a reported bad route. Readers must confirm immediate availability and intake at use time. Human review remains pending.

Validate collection/schema, all dependency-free tests, pinned Awesome Lint for all three affected lists, deterministic site generation and generated-site checks, local Markdown links/fragments, preserved IDs/aliases/counts, and search performance budgets. Browser checks cover both guide routes, cross-links, 320/390px and desktop layouts, keyboard/table access, light/dark, reduced motion, print, EN/RU shells, and no-JavaScript fallback. Generated `dist/` files and QA screenshots are not source changes.

Browser QA also identified two shared presentation defects. Print CSS now exposes the native details content so a collapsed guide is included in print. Guide table wrappers establish the containing block for absolutely positioned screen-reader new-tab hints; these remain accessible while their overflow stays inside the scrollable table at 320px. Both are focused CSS changes; guide state and runtime behavior stay intact.
