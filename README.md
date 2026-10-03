# National Minimum Wage Check

A four-step calculator for basic pay, contracted hours, salary sacrifice and age band.

## Shared reference data

Both AfC pay and minimum wage rates come directly from CARculator's existing API:

- `/agenda-for-change-pay-rates`
- `/national-minimum-wage-rates`

There are no copied rate tables, duplicate database tables, saved snapshots or fallback rates. Each page load retrieves both tables through the read-only local proxy. If loading fails, calculation is disabled until retrieval succeeds. The passkey is held in the server environment and is never sent to the browser or included in these files. Existing CARculator files and its API are unchanged.

## Run locally

From this folder, enter the existing CARculator passkey at the hidden prompt:

```sh
read -s 'CARCULATOR_PASSKEY?CARculator passkey: '
export CARCULATOR_PASSKEY
python3 server.py
```

Open http://127.0.0.1:8765. The prompt above uses zsh, the user's configured shell. No packages need installing. Opening the HTML file alone cannot load the shared API; run the local server.

## Calculation

Actual annual pay = full-time equivalent annual basic pay × contracted time ÷ whole-time time.

Annual sacrifice = monthly amount × 12, or the annual amount entered. This is the actual amount removed from the user's own pay; it is not pro-rated again.

Hourly pay after sacrifice = (actual annual pay − annual sacrifice) ÷ (weekly contracted hours × 52.1428).

The weeks factor follows CARculator. Sessions are converted using the entered hours per session. AfC whole-time hours are fixed at 37.5. The threshold uses the selected shared age-band rate and compares before display rounding. Equality meets the threshold.

This is a regular basic-salary estimate, assuming equal monthly pay and sacrifice. It is not a full payroll compliance assessment: actual contractual annual basic hours, extra hours, uneven deductions and other pay adjustments can change the result. Apprentice-specific eligibility is outside the three age bands provided by CARculator.

## Verification

`node calculation.test.js`

The CARculator age-band values retrieved on 3 October 2026 matched the current GOV.UK rates. No numerical rates are stored in the app. Shared data updates take effect on a new page load; the source API must be maintained for future rate changes.

- [GOV.UK minimum wage rates](https://www.gov.uk/national-minimum-wage-rates)
- [HMRC salary sacrifice guidance](https://www.gov.uk/hmrc-internal-manuals/national-minimum-wage-manual/nmwm09300)
- [GOV.UK hours and salaried work guidance](https://www.gov.uk/guidance/calculating-the-minimum-wage/working-hours-for-which-the-minimum-wage-must-be-paid)

## Netlify

The Netlify function reads the same existing API as CARculator's hosted admin page. The frontend calls `/api/reference-data`, which is routed to this function. No Python server is required on Netlify.

Set `CARCULATOR_PASSKEY` in the Netlify project environment variables (Functions scope, or all scopes) to the existing scheme passkey. It must not be a frontend variable or committed to Git. Optionally set `CARCULATOR_API_BASE_URL` if CARculator changes its API; its current deployed API is the default.

Deploy with build command `node scripts/build.js`, publish directory `public`, and functions directory `netlify/functions`, as configured in `netlify.toml`. Environment-variable changes require a fresh deployment. For manual deployment with the Netlify CLI, build locally, then deploy both `public` and `netlify/functions`; a browser drag-and-drop of static files alone does not deploy this backend.

Shared table updates become available on the next page load without a calculator redeployment.
