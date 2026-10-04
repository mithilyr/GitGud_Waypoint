"""Everything the API needs on a fresh database: reference CSVs, then accounts and the demo delivery day."""

from seed import demo, import_csv


def main() -> None:
    import_csv.main()
    demo.main()


if __name__ == "__main__":
    main()
