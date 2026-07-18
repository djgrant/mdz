# Incident briefing — duplicate billing charges

The nightly billing batch run on 12 May applied the renewal charge twice to a
subset of orders. Three orders are affected; the details are in orders.csv.
The root cause is the disabled double-charge guard in billing-config.json.
The remediation ticket is TCK-2201.
