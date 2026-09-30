"""Reference tables seeded 1:1 from the shared competition CSVs.

Operational tables (order, plan, trip, stop, deferral, load_check,
delivery_event, receipt, user) go in their own modules.
See 02-plan/SYSTEM-ARCHITECTURE.md section 4.
"""
from datetime import date

from sqlalchemy import Date, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Outlet(Base):
    __tablename__ = "outlet"
    outlet_id: Mapped[str] = mapped_column(String(8), primary_key=True)
    brand: Mapped[str] = mapped_column(String(8))
    district: Mapped[str] = mapped_column(String(32))
    depot: Mapped[str] = mapped_column(String(16))
    dock_type: Mapped[str] = mapped_column(String(16))
    parking_constraint: Mapped[str] = mapped_column(String(16))
    mall_window: Mapped[str | None] = mapped_column(String(16))
    window_open_time: Mapped[str] = mapped_column(String(5))
    window_close_time: Mapped[str] = mapped_column(String(5))
    name: Mapped[str | None] = mapped_column(String(48))  # display name, seeded from seed/data/outlet_names.csv


class Vehicle(Base):
    __tablename__ = "vehicle"
    vehicle_id: Mapped[str] = mapped_column(String(8), primary_key=True)
    type: Mapped[str] = mapped_column(String(8))
    temp: Mapped[str] = mapped_column(String(8))
    weight_cap_kg: Mapped[float] = mapped_column(Float)
    volume_cap_m3: Mapped[float] = mapped_column(Float)
    fuel_type: Mapped[str] = mapped_column(String(16))
    km_per_l: Mapped[float] = mapped_column(Float)
    weekly_fuel_quota_l: Mapped[float] = mapped_column(Float)
    depot: Mapped[str] = mapped_column(String(16))


class CalendarDay(Base):
    __tablename__ = "calendar_day"
    date: Mapped[date] = mapped_column(Date, primary_key=True)
    dow: Mapped[int] = mapped_column(Integer)
    dow_name: Mapped[str] = mapped_column(String(3))
    is_weekend: Mapped[int] = mapped_column(Integer)
    iso_year: Mapped[int] = mapped_column(Integer)
    iso_week: Mapped[int] = mapped_column(Integer)
    is_payday: Mapped[int] = mapped_column(Integer)
    festival: Mapped[str | None] = mapped_column(String(32))
    festival_ramp: Mapped[float] = mapped_column(Float)
    is_holiday: Mapped[int] = mapped_column(Integer)
    monsoon: Mapped[int] = mapped_column(Integer)
    is_operating: Mapped[int] = mapped_column(Integer)


class DistrictTravel(Base):
    __tablename__ = "district_travel"
    district: Mapped[str] = mapped_column(String(32), primary_key=True)
    depot: Mapped[str] = mapped_column(String(16))
    road_class: Mapped[str] = mapped_column(String(16))
    free_flow_kmh: Mapped[float] = mapped_column(Float)
    depot_to_district_km: Mapped[float] = mapped_column(Float)
    depot_to_district_freeflow_min: Mapped[float] = mapped_column(Float)
    inter_stop_km: Mapped[float] = mapped_column(Float)
    inter_stop_freeflow_min: Mapped[float] = mapped_column(Float)


class ServiceAllowance(Base):
    __tablename__ = "service_allowance"
    brand: Mapped[str] = mapped_column(String(8), primary_key=True)
    dock_type: Mapped[str] = mapped_column(String(16), primary_key=True)
    service_allowance_min: Mapped[float] = mapped_column(Float)


class TrafficSpeed(Base):
    __tablename__ = "traffic_speed"
    district: Mapped[str] = mapped_column(String(32), primary_key=True)
    hour: Mapped[int] = mapped_column(Integer, primary_key=True)
    monsoon: Mapped[int] = mapped_column(Integer, primary_key=True)
    speed_index: Mapped[float] = mapped_column(Float)


class RoadCondition(Base):
    __tablename__ = "road_condition"
    district: Mapped[str] = mapped_column(String(32), primary_key=True)
    date: Mapped[date] = mapped_column(Date, primary_key=True)
    disruption_index: Mapped[float] = mapped_column(Float)
