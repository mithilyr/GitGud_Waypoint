# Data model

Reference tables are seeded 1:1 from the organisers' CSVs (`services/api/seed/data/`). Operational tables are the shared record the four roles write to. Migrations: `0001` (reference), `0002` (operations + outlet display name).

```mermaid
erDiagram
  OUTLET ||--o{ CUSTOMER_ORDER : places
  VEHICLE ||--o{ TRIP : drives
  PLAN ||--o{ TRIP : contains
  TRIP ||--o{ STOP : visits
  CUSTOMER_ORDER ||--o| STOP : "planned as"
  TRIP ||--o{ LOAD_LINE : loads
  STOP ||--o{ LOAD_LINE : "for"
  CUSTOMER_ORDER ||--o{ DEFERRAL : "deferred by"
  PLAN ||--o{ DEFERRAL : records
  TRIP ||--o{ DELIVERY_EVENT : "reported by"
  STOP ||--o| RECEIPT : "confirmed by"
  STOP ||--o{ ISSUE_REPORT : "reported on"
  STOP ||--o{ CONFLICT : "disputed in"
  APP_USER }o--o| OUTLET : "manages"
  APP_USER }o--o| VEHICLE : "drives"
  VEHICLE ||--o{ VEHICLE_STATUS : "available on"
  VEHICLE ||--o{ FUEL_LEDGER : "uses"

  OUTLET { string outlet_id PK  string name  string brand  string district  string depot  string dock_type  string parking_constraint  string window_open_time  string window_close_time }
  VEHICLE { string vehicle_id PK  string type  string temp  float weight_cap_kg  float volume_cap_m3  float km_per_l  float weekly_fuel_quota_l  string depot }
  CUSTOMER_ORDER { string id PK  string outlet_id FK  date service_date  string temp_requirement  string status  float weight_kg  float volume_m3  json lines  bool deferred_yesterday }
  PLAN { int id PK  string depot  date service_date  string status  int version }
  TRIP { int id PK  int plan_id FK  string vehicle_id FK  int trip_no  string brand  string district  string status  string depart_planned  json change }
  STOP { int id PK  int trip_id FK  int seq  string order_id FK  string eta  string status  json delivery  bool removed }
  LOAD_LINE { int id PK  int trip_id FK  int stop_id FK  string group  int planned  bool loaded  int found  string flag_status }
  DEFERRAL { int id PK  string order_id FK  string reason  date deferred_to  bool skipped_before }
  DELIVERY_EVENT { int id PK  string client_uuid UK  int trip_id FK  string kind  json payload  datetime device_ts  datetime server_ts }
  RECEIPT { int id PK  int stop_id FK  string status  json lines }
  CONFLICT { int id PK  int stop_id FK  string kind  int driver_count  int store_count  string status }
  APP_USER { int id PK  string email UK  string role  string outlet_id  string vehicle_id }
```

Other tables: `notification` (structured messages between roles: deferral alerts, plan changes, flags; no free chat), `item` (the order catalogue with kg and m³ per unit), `issue_report`, and the seeded reference tables `calendar_day`, `district_travel`, `service_allowance`, `traffic_speed`, `road_condition`.

## Order lifecycle

`confirmed → planned | deferred → loaded | shortfall → out_for_delivery → delivered | partial | failed → received | issue_reported`

A store basket with chilled and dry lines becomes **two orders** (one per temperature), exactly like the dataset, so chilled goods can be routed to a reefer independently.

## Trip lifecycle

`planned → loading → released` (by the loader, with reefer temperature and seal) `→ out → completed`. Editing a released plan bumps `plan.version`, diffs each affected trip's `load_line` rows and stores the difference in `trip.change` (add / take off). Removed stops are kept (`stop.removed`) so a driver's late record for them becomes a conflict instead of vanishing.

## The seeded demo day

`demo_orders.csv` holds 151 real orders (58 Kandy, 93 Peliyagoda) from the heaviest historical day, re-dated to `DEMO_SERVICE_DATE` (Mon 5 Oct 2026). Four Kandy reefer trucks are in the workshop and the week's fuel is partly used, so demand exceeds capacity and the engine defers orders with reasons. `POST /demo/reset` restores it.
