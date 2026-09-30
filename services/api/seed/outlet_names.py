"""Display names for the 120 outlets. The dataset only has IDs; these give the screens a place to read.

Names are assigned per depot, district and brand in outlet-ID order, so they never change between installs.
"""

FRESH = {
    # Kandy depot. The first four Kandy names are the truck-accessible outlets (rear dock, not van-only).
    "Kandy": [
        "Pilimathalawa", "Peradeniya", "Katugastota", "Gampola", "Kandy Bazaar", "Kundasale", "Digana", "Akurana",
        "Tennekumbura", "Heerassagala", "Suduhumpola", "Kadugannawa",
    ],
    "Matale": ["Ukuwela", "Matale Town", "Rattota", "Galewela", "Dambulla Road", "Naula"],
    "Nuwara Eliya": ["Nuwara Eliya Town", "Hatton", "Nanu Oya", "Ragala", "Kandapola"],
    "Badulla": ["Badulla Town", "Bandarawela", "Haputale", "Welimada"],
    "Kegalle": ["Kegalle Town", "Mawanella", "Warakapola", "Rambukkana"],
    # Peliyagoda depot
    "Colombo": [
        "Kollupitiya", "Bambalapitiya", "Wellawatte", "Dehiwala", "Mount Lavinia", "Nugegoda", "Maharagama",
        "Battaramulla", "Rajagiriya", "Kotte", "Borella", "Maradana", "Pettah", "Kirulapone", "Havelock Town",
        "Narahenpita", "Kelaniya", "Peliyagoda Market", "Wattala", "Mattakkuliya", "Grandpass", "Slave Island",
        "Thimbirigasyaya", "Kohuwala",
    ],
    "Gampaha": [
        "Gampaha Town", "Ja-Ela", "Ragama", "Kadawatha", "Kiribathgoda", "Minuwangoda", "Negombo", "Veyangoda",
        "Nittambuwa", "Divulapitiya", "Katunayake", "Seeduwa", "Ekala", "Yakkala", "Dompe",
    ],
    "Kalutara": ["Kalutara Town", "Panadura", "Horana", "Aluthgama", "Beruwala", "Wadduwa", "Bandaragama", "Matugama", "Ingiriya", "Bulathsinhala"],
    "Galle": ["Galle Fort", "Hikkaduwa", "Ambalangoda", "Karapitiya", "Baddegama", "Elpitiya", "Unawatuna", "Bentota", "Habaraduwa"],
    "Kurunegala": ["Kurunegala Town", "Kuliyapitiya", "Narammala", "Pannala", "Wariyapola", "Polgahawela", "Mawathagama", "Alawwa"],
    "Matara": ["Matara Town", "Weligama", "Dikwella", "Akuressa", "Kamburupitiya", "Devinuwara"],
    "Puttalam": ["Puttalam Town", "Chilaw", "Wennappuwa"],
}

STYLE = {
    "Kandy": ["Kandy City Centre", "Kandy Mall", "Kandy Main Street", "Kandy Trinity Plaza", "Kandy Old Town"],
    "Matale": ["Matale Fashion House"],
    "Nuwara Eliya": ["Nuwara Eliya Fashion"],
    "Badulla": ["Badulla Style Hub"],
    "Kegalle": ["Kegalle Fashion"],
}
TECH = {
    "Kandy": ["Kandy Tech Hub", "Kandy Tech Express", "Kandy Tech Plaza"],
    "Matale": ["Matale Tech Point"],
    "Badulla": ["Badulla Tech"],
}


def assign(outlets: list[dict]) -> dict[str, str]:
    """outlets: rows with outlet_id, brand, district, depot, parking_constraint, dock_type. Returns id -> name."""
    names: dict[str, str] = {}
    used: dict[tuple[str, str], int] = {}
    for o in sorted(outlets, key=lambda r: r["outlet_id"]):
        brand, district = o["brand"], o["district"]
        pool = {"Fresh": FRESH, "Style": STYLE, "Tech": TECH}[brand].get(district)
        key = (brand, district)
        i = used.get(key, 0)
        used[key] = i + 1
        if brand == "Fresh" and district == "Kandy":
            # Truck-accessible outlets take the first (story) names, van-only ones the rest.
            continue
        if pool and i < len(pool):
            names[o["outlet_id"]] = pool[i]
        else:
            base = (FRESH.get(district) or [district])[i % len(FRESH.get(district) or [district])]
            names[o["outlet_id"]] = f"{base} {brand}" if brand != "Fresh" else f"{district} {i + 1}"
    # Fresh Kandy: normal outlets first, then van-only, from the same list.
    kandy = [o for o in outlets if o["brand"] == "Fresh" and o["district"] == "Kandy"]
    kandy.sort(key=lambda r: (r["parking_constraint"] == "van_only", r["outlet_id"]))
    for o, n in zip(kandy, FRESH["Kandy"], strict=False):
        names[o["outlet_id"]] = n
    return names
