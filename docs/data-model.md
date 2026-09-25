# Data model

> Update this whenever a migration is added.

## Reference tables (seeded from the shared CSVs)
| Table | Key | Source |
|---|---|---|
| `outlet` | outlet_id | outlets.csv |
| `vehicle` | vehicle_id | vehicles.csv |
| `calendar_day` | date | calendar.csv |
| `district_travel` | district | district_travel.csv |
| `service_allowance` | brand, dock_type | service_allowance.csv |
| `traffic_speed` | district, hour, monsoon | traffic_speed.csv |
| `road_condition` | district, date | road_conditions.csv |

## Operational tables (to build)
`user`, `order`, `plan`, `trip`, `stop`, `deferral`, `load_check`, `delivery_event`, `receipt`, `fuel_ledger`

Order lifecycle: `placed → confirmed → planned | deferred → loaded | shortfall → out_for_delivery → delivered | partial | failed → received | issue_reported`
