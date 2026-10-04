"""Operational tables: the shared record that order -> plan -> load -> deliver -> receipt writes to.

Reference tables (outlet, vehicle, ...) live in reference.py and are seeded from the shared CSVs.
See docs/data-model.md for the diagram.
"""

from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, TZDateTime


def _now() -> datetime:
    return datetime.now().astimezone()


class User(Base):
    __tablename__ = "app_user"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(120), unique=True)
    name: Mapped[str] = mapped_column(String(80))
    role: Mapped[str] = mapped_column(String(16))  # dispatcher | loader | driver | store
    password_hash: Mapped[str] = mapped_column(String(200))
    pin_hash: Mapped[str | None] = mapped_column(String(200))
    depot: Mapped[str | None] = mapped_column(String(16))
    outlet_id: Mapped[str | None] = mapped_column(String(8))  # store manager scope
    vehicle_id: Mapped[str | None] = mapped_column(String(8))  # driver's own vehicle
    driver_code: Mapped[str | None] = mapped_column(String(16))
    dock: Mapped[str | None] = mapped_column(String(16))
    phone: Mapped[str | None] = mapped_column(String(20))


class Item(Base):
    """Catalogue of what stores can order (S1a). Weight and volume drive the plan."""

    __tablename__ = "item"
    sku: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    category: Mapped[str] = mapped_column(String(24))  # Dairy, Dry goods, Frozen, Household, Garments, Appliances
    load_group: Mapped[str] = mapped_column(String(32))  # how the loader sees it: "Dairy", "Meat & fish", ...
    brand: Mapped[str] = mapped_column(String(8))
    temp: Mapped[str] = mapped_column(String(8))  # chilled | ambient
    pack_size: Mapped[int] = mapped_column(Integer)  # units per crate/carton
    pack_label: Mapped[str] = mapped_column(String(12))  # crate | carton | piece
    kg_per_unit: Mapped[float] = mapped_column(Float)
    m3_per_unit: Mapped[float] = mapped_column(Float)
    price: Mapped[float] = mapped_column(Float)
    often: Mapped[bool] = mapped_column(Boolean, default=False)


class Order(Base):
    __tablename__ = "customer_order"
    id: Mapped[str] = mapped_column(String(12), primary_key=True)  # ORD0092310
    outlet_id: Mapped[str] = mapped_column(String(8), ForeignKey("outlet.outlet_id"), index=True)
    brand: Mapped[str] = mapped_column(String(8))
    depot: Mapped[str] = mapped_column(String(16))
    district: Mapped[str] = mapped_column(String(32))
    service_date: Mapped[date] = mapped_column(Date, index=True)
    temp_requirement: Mapped[str] = mapped_column(String(8))
    # placed -> confirmed -> planned | deferred -> loaded | shortfall -> out_for_delivery
    #   -> delivered | partial | failed -> received | issue_reported
    status: Mapped[str] = mapped_column(String(20), default="confirmed")
    weight_kg: Mapped[float] = mapped_column(Float)
    volume_m3: Mapped[float] = mapped_column(Float)
    lines: Mapped[list] = mapped_column(JSON, default=list)  # [{sku, name, group, qty, packs, pack_label, temp}]
    group_ref: Mapped[str | None] = mapped_column(String(16))  # links the chilled + ambient halves of one basket
    deferred_yesterday: Mapped[bool] = mapped_column(Boolean, default=False)
    days_since_last_served: Mapped[int] = mapped_column(Integer, default=1)
    placed_at: Mapped[datetime] = mapped_column(TZDateTime, default=_now)
    placed_by: Mapped[str | None] = mapped_column(String(80))
    deferral_reason: Mapped[str | None] = mapped_column(String(24))
    deferral_note: Mapped[str | None] = mapped_column(Text)
    deferred_to: Mapped[date | None] = mapped_column(Date)

    outlet = relationship("Outlet", lazy="joined")


class Plan(Base):
    __tablename__ = "plan"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    depot: Mapped[str] = mapped_column(String(16))
    service_date: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(12), default="draft")  # draft | released
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(TZDateTime, default=_now)
    released_at: Mapped[datetime | None] = mapped_column(TZDateTime)
    created_by: Mapped[str | None] = mapped_column(String(80))

    trips: Mapped[list["Trip"]] = relationship(back_populates="plan", cascade="all, delete-orphan")


class Trip(Base):
    __tablename__ = "trip"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("plan.id"), index=True)
    vehicle_id: Mapped[str] = mapped_column(String(8), ForeignKey("vehicle.vehicle_id"))
    trip_no: Mapped[int] = mapped_column(Integer)
    brand: Mapped[str] = mapped_column(String(8))
    district: Mapped[str] = mapped_column(String(32))
    # planned -> loading -> released -> out -> completed
    status: Mapped[str] = mapped_column(String(12), default="planned")
    depart_planned: Mapped[str | None] = mapped_column(String(5))
    started_by: Mapped[str | None] = mapped_column(String(80))  # loader who opened it
    released_by: Mapped[str | None] = mapped_column(String(80))
    released_at: Mapped[datetime | None] = mapped_column(TZDateTime)
    reefer_temp: Mapped[float | None] = mapped_column(Float)
    seal_no: Mapped[str | None] = mapped_column(String(24))
    driver_started_at: Mapped[datetime | None] = mapped_column(TZDateTime)
    completed_at: Mapped[datetime | None] = mapped_column(TZDateTime)
    change: Mapped[dict | None] = mapped_column(JSON)  # {at, note, add:[...], remove:[...], acked}
    last_seen_at: Mapped[datetime | None] = mapped_column(TZDateTime)  # last driver sync/heartbeat

    plan: Mapped[Plan] = relationship(back_populates="trips")
    stops: Mapped[list["Stop"]] = relationship(back_populates="trip", cascade="all, delete-orphan", order_by="Stop.seq")
    lines: Mapped[list["LoadLine"]] = relationship(cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("plan_id", "vehicle_id", "trip_no"),)


class Stop(Base):
    __tablename__ = "stop"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trip.id"), index=True)
    seq: Mapped[int] = mapped_column(Integer)
    order_id: Mapped[str] = mapped_column(String(12), ForeignKey("customer_order.id"))
    outlet_id: Mapped[str] = mapped_column(String(8), ForeignKey("outlet.outlet_id"))
    eta: Mapped[str | None] = mapped_column(String(5))
    window_open: Mapped[str] = mapped_column(String(5))
    window_close: Mapped[str] = mapped_column(String(5))
    status: Mapped[str] = mapped_column(String(12), default="pending")  # pending|arrived|delivered|partial|failed
    arrived_at: Mapped[datetime | None] = mapped_column(TZDateTime)  # phone clock
    done_at: Mapped[datetime | None] = mapped_column(TZDateTime)  # phone clock
    synced_at: Mapped[datetime | None] = mapped_column(TZDateTime)
    delivery: Mapped[dict | None] = mapped_column(JSON)  # {outcome, items:[{group,planned,handed}], note, signed_by, photo}
    removed: Mapped[bool] = mapped_column(Boolean, default=False)  # moved off this trip by a later plan change

    trip: Mapped[Trip] = relationship(back_populates="stops")
    order = relationship("Order", lazy="joined")
    outlet = relationship("Outlet", lazy="joined")


class LoadLine(Base):
    """One thing to put on the truck: a load group (e.g. Dairy, 8 crates) for one stop."""

    __tablename__ = "load_line"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trip.id"), index=True)
    stop_id: Mapped[int] = mapped_column(ForeignKey("stop.id"))
    group: Mapped[str] = mapped_column(String(32))
    unit: Mapped[str] = mapped_column(String(12))
    temp: Mapped[str] = mapped_column(String(8))
    planned: Mapped[int] = mapped_column(Integer)
    loaded: Mapped[bool] = mapped_column(Boolean, default=False)
    found: Mapped[int | None] = mapped_column(Integer)
    flag_reason: Mapped[str | None] = mapped_column(String(16))  # not_in_stock|damaged|wrong_item|wont_fit
    flag_status: Mapped[str | None] = mapped_column(String(12))  # open | answered
    flag_answer: Mapped[str | None] = mapped_column(String(16))  # top_up | send_as_is
    flag_note: Mapped[str | None] = mapped_column(Text)
    flag_photo: Mapped[str | None] = mapped_column(Text)
    flagged_by: Mapped[str | None] = mapped_column(String(80))
    flagged_at: Mapped[datetime | None] = mapped_column(TZDateTime)
    loaded_by: Mapped[str | None] = mapped_column(String(80))

    stop: Mapped[Stop] = relationship()


class Deferral(Base):
    __tablename__ = "deferral"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plan_id: Mapped[int | None] = mapped_column(ForeignKey("plan.id"))
    order_id: Mapped[str] = mapped_column(String(12), ForeignKey("customer_order.id"), index=True)
    reason: Mapped[str] = mapped_column(String(24))
    note: Mapped[str | None] = mapped_column(Text)
    deferred_to: Mapped[date | None] = mapped_column(Date)
    skipped_before: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String(12), default="engine")  # engine | dispatcher
    created_by: Mapped[str | None] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(TZDateTime, default=_now)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class DeliveryEvent(Base):
    """Append-only. The client UUID makes retries idempotent; device_ts keeps the order things happened."""

    __tablename__ = "delivery_event"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_uuid: Mapped[str] = mapped_column(String(40), unique=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trip.id"), index=True)
    stop_id: Mapped[int | None] = mapped_column(ForeignKey("stop.id"))
    driver_id: Mapped[int] = mapped_column(ForeignKey("app_user.id"))
    kind: Mapped[str] = mapped_column(String(20))  # trip_start | arrive | deliver | conflict_answer | notice_read
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    device_ts: Mapped[datetime] = mapped_column(TZDateTime)
    server_ts: Mapped[datetime] = mapped_column(TZDateTime, default=_now)
    late_by_s: Mapped[int] = mapped_column(Integer, default=0)  # how long it sat in the outbox


class Receipt(Base):
    __tablename__ = "receipt"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    stop_id: Mapped[int] = mapped_column(ForeignKey("stop.id"), unique=True)
    order_id: Mapped[str] = mapped_column(String(12), ForeignKey("customer_order.id"))
    status: Mapped[str] = mapped_column(String(12))  # confirmed | issue
    lines: Mapped[list] = mapped_column(JSON, default=list)  # [{group, expected, received}]
    confirmed_by: Mapped[str | None] = mapped_column(String(80))
    confirmed_at: Mapped[datetime] = mapped_column(TZDateTime, default=_now)


class IssueReport(Base):
    __tablename__ = "issue_report"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    stop_id: Mapped[int] = mapped_column(ForeignKey("stop.id"))
    order_id: Mapped[str] = mapped_column(String(12), ForeignKey("customer_order.id"))
    kind: Mapped[str] = mapped_column(String(12))  # short | damaged | wrong_item | other
    line: Mapped[str | None] = mapped_column(String(60))
    note: Mapped[str | None] = mapped_column(Text)
    photo: Mapped[str | None] = mapped_column(Text)
    reported_by: Mapped[str | None] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(TZDateTime, default=_now)

    @property
    def code(self) -> str:
        return f"RPT-{self.id + 411:04d}"


class Conflict(Base):
    """Driver and store disagree about a count, or a stop moved while the driver was offline."""

    __tablename__ = "conflict"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    stop_id: Mapped[int] = mapped_column(ForeignKey("stop.id"), index=True)
    kind: Mapped[str] = mapped_column(String(16))  # count | reassigned
    line: Mapped[str | None] = mapped_column(String(60))
    driver_count: Mapped[int | None] = mapped_column(Integer)
    store_count: Mapped[int | None] = mapped_column(Integer)
    driver_stance: Mapped[str | None] = mapped_column(String(10))  # accept | dispute
    status: Mapped[str] = mapped_column(String(10), default="open")  # open | resolved
    resolution: Mapped[str | None] = mapped_column(String(16))  # accept_store | accept_driver | acknowledged
    created_at: Mapped[datetime] = mapped_column(TZDateTime, default=_now)


class Notification(Base):
    """Structured messages between roles (deferral alerts, plan changes, flags). No free chat."""

    __tablename__ = "notification"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    role: Mapped[str] = mapped_column(String(16), index=True)
    user_id: Mapped[int | None] = mapped_column(Integer, index=True)
    outlet_id: Mapped[str | None] = mapped_column(String(8), index=True)
    depot: Mapped[str | None] = mapped_column(String(16))
    kind: Mapped[str] = mapped_column(String(24))
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text, default="")
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(TZDateTime, default=_now)
    read_at: Mapped[datetime | None] = mapped_column(TZDateTime)


class VehicleStatus(Base):
    __tablename__ = "vehicle_status"
    vehicle_id: Mapped[str] = mapped_column(String(8), primary_key=True)
    date: Mapped[date] = mapped_column(Date, primary_key=True)
    status: Mapped[str] = mapped_column(String(12))  # available | workshop
    note: Mapped[str | None] = mapped_column(String(120))


class FuelLedger(Base):
    """Litres used so far in the week, before today's plan. Today's plan adds to it."""

    __tablename__ = "fuel_ledger"
    vehicle_id: Mapped[str] = mapped_column(String(8), primary_key=True)
    week_start: Mapped[date] = mapped_column(Date, primary_key=True)
    litres_used: Mapped[float] = mapped_column(Float, default=0.0)
