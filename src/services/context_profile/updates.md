USER:
We have an MVP called Fleettrack. Yoc can check all files in the directory everytime to understand it as we created it together:


Goal: Research and propose an integrated, simple, and robust solution to support trucking customers who manage diesel (litres) and LP gas (kgs) including reconciliation (loaded vs offloaded), invoiced vs paid amounts, and discrepancy detection — while keeping the current customer types (taxis, couriers, parcel) unaffected and the app simple.As you are aware, our current mvp does not cater for them.

Please produce, in order:
A. Research brief: competitor examples, common trucking fuel workflows, tradeoffs for tracking litres vs kgs, best practices for reconciliation.
B. User journeys (3–4 flows): driver load, offload, invoice/payment reconciliation, discrepancy handling.

c. UI/UX screens (wireframes + component list) that integrate commodity metrics into existing dashboards without confusing other users. Provide a dark/light color proposal using the 3 hexes I'll send, and default accessible palette if I don't send hexes.
D. Analytics dashboard specs and example visualizations (metrics, charts, alert rules).
E. These changes or updates should NOT BREAK the current working system which caters for taxi owners etc.I want the system to integrate and cater fro both.Fuel truck owners and current target with great user experience and flow:
## some fuel metric features to consider as you researc:
Design a feature spec for Fuel Events and Reconciliation:
- Entities: LoadEvent, OffloadEvent, Invoice, Payment, TankReading
- Core fields and validations
- Reconciliation rules to flag discrepancies (thresholds, rounding, unit conversions)
- UI screens: create event, quick reconcile, dispute workflow, audit log
- Analytics and alerts




Assumptions: You can check the overal current MVP to understand andy context,if have question ask me.
Start with the research brief and high-level recommendations and give me your recommendation for approval.
