use crate::constants::{seconds_to_years_wad, usdc_to_wad, wad_to_usdc, WAD};

#[test]
fn exposes_scaffold_version() {
    assert_eq!(crate::version(), "0.1.0");
}

#[test]
fn converts_usdc_units_to_wad_and_back() {
    let usdc_atomic = 500_000_000;
    let wad = usdc_to_wad(usdc_atomic);

    assert_eq!(wad_to_usdc(wad), usdc_atomic);
}

#[test]
fn converts_seconds_to_years_wad() {
    assert_eq!(seconds_to_years_wad(31_536_000), WAD);
    assert_eq!(seconds_to_years_wad(15_768_000), WAD / 2);
}
