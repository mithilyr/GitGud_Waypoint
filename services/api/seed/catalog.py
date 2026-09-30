"""Product catalogue (S1a). kg and m3 are per single unit as ordered; pack_size units fill one crate/carton."""

# sku, name, category, load_group, brand, temp, pack_size, pack_label, kg, m3, price, often
ITEMS = [
    # Fresh, chilled
    ("MLK1", "Full cream milk 1L", "Dairy", "Dairy", "Fresh", "chilled", 12, "crate", 1.04, 0.0016, 380, True),
    ("BTR2", "Butter 200g", "Dairy", "Dairy", "Fresh", "chilled", 24, "crate", 0.21, 0.0004, 690, False),
    ("CHZ2", "Cheese slices 200g", "Dairy", "Dairy", "Fresh", "chilled", 20, "crate", 0.22, 0.0004, 720, False),
    ("YOG1", "Yoghurt cups 80g · pack of 12", "Dairy", "Yoghurt & curd", "Fresh", "chilled", 6, "crate", 1.1, 0.0018, 1080, True),
    ("CRD1", "Buffalo curd · clay pot 1L", "Dairy", "Yoghurt & curd", "Fresh", "chilled", 8, "crate", 1.4, 0.0016, 850, True),
    ("CHK1", "Chicken whole 1kg", "Meat & fish", "Meat & fish", "Fresh", "chilled", 10, "crate", 1.05, 0.0025, 1450, False),
    ("FSH5", "Fish fillets 500g", "Meat & fish", "Meat & fish", "Fresh", "chilled", 12, "crate", 0.52, 0.0011, 980, False),
    ("SAU5", "Sausages 500g", "Meat & fish", "Meat & fish", "Fresh", "chilled", 20, "crate", 0.52, 0.0009, 760, False),
    ("PEA1", "Frozen peas 1kg", "Frozen", "Frozen", "Fresh", "chilled", 12, "crate", 1.02, 0.0018, 640, False),
    # Fresh, ambient
    ("DHL5", "Dhal 5kg bag", "Dry goods", "Dry groceries", "Fresh", "ambient", 4, "carton", 5.05, 0.007, 1980, True),
    ("RCE5", "Basmati rice 5kg", "Dry goods", "Dry groceries", "Fresh", "ambient", 4, "carton", 5.1, 0.007, 2150, True),
    ("RRR5", "Red raw rice 5kg", "Dry goods", "Dry groceries", "Fresh", "ambient", 4, "carton", 5.1, 0.007, 1450, False),
    ("EGG3", "Eggs (tray of 30)", "Dry goods", "Dry groceries", "Fresh", "ambient", 12, "carton", 1.9, 0.0045, 1120, True),
    ("OIL1", "Coconut oil 1L", "Dry goods", "Dry groceries", "Fresh", "ambient", 12, "carton", 0.95, 0.0011, 690, False),
    ("MFC1", "Maldive fish chips 100g", "Dry goods", "Dry groceries", "Fresh", "ambient", 40, "carton", 0.11, 0.0002, 520, False),
    ("SUG1", "White sugar 1kg", "Dry goods", "Dry groceries", "Fresh", "ambient", 20, "carton", 1.02, 0.0013, 310, False),
    ("TEA4", "Ceylon tea 400g", "Dry goods", "Dry groceries", "Fresh", "ambient", 20, "carton", 0.42, 0.0012, 890, False),
    ("SOP1", "Soap bar 100g", "Household", "Household", "Fresh", "ambient", 48, "carton", 0.11, 0.0002, 120, False),
    ("DET1", "Detergent powder 1kg", "Household", "Household", "Fresh", "ambient", 12, "carton", 1.05, 0.0016, 560, False),
    # Style (garments in cartons)
    ("SHT1", "Cotton shirts · carton of 24", "Garments", "Garments", "Style", "ambient", 1, "carton", 9.5, 0.14, 38000, True),
    ("JNS1", "Denim jeans · carton of 20", "Garments", "Garments", "Style", "ambient", 1, "carton", 16.0, 0.16, 52000, True),
    ("SAR1", "Handloom sarees · carton of 12", "Garments", "Garments", "Style", "ambient", 1, "carton", 8.0, 0.13, 74000, False),
    ("KID1", "Kids wear · carton of 40", "Garments", "Garments", "Style", "ambient", 1, "carton", 11.0, 0.18, 46000, False),
    ("TSH1", "T-shirts · carton of 48", "Garments", "Garments", "Style", "ambient", 1, "carton", 12.0, 0.2, 33000, False),
    # Tech (heavy, fragile, valuable)
    ("FRG2", "Refrigerator 210L", "Appliances", "Appliances", "Tech", "ambient", 1, "piece", 55.0, 0.95, 145000, True),
    ("WSH8", "Washing machine 8kg", "Appliances", "Appliances", "Tech", "ambient", 1, "piece", 62.0, 0.55, 118000, True),
    ("TV43", "Television 43 inch", "Appliances", "Appliances", "Tech", "ambient", 1, "piece", 9.0, 0.2, 89000, False),
    ("MCW1", "Microwave oven 25L", "Appliances", "Appliances", "Tech", "ambient", 1, "piece", 12.0, 0.09, 42000, False),
    ("AFR1", "Air fryer 5L", "Appliances", "Appliances", "Tech", "ambient", 1, "piece", 5.0, 0.04, 36000, False),
    ("RCK1", "Rice cooker 1.8L", "Appliances", "Appliances", "Tech", "ambient", 1, "piece", 3.0, 0.02, 14500, False),
]
