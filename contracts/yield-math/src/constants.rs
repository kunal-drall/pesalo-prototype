pub const WAD: i128 = 1_000_000_000_000_000_000;
pub const HALF_WAD: i128 = 500_000_000_000_000_000;
pub const LN2: i128 = 693_147_180_559_945_309;
pub const E: i128 = 2_718_281_828_459_045_235;
pub const SECONDS_PER_YEAR: u64 = 31_536_000;
pub const WAD_TO_USDC: i128 = 100_000_000_000;

pub fn wad_to_usdc(wad: i128) -> i128 {
    wad / WAD_TO_USDC
}

pub fn usdc_to_wad(usdc: i128) -> i128 {
    usdc * WAD_TO_USDC
}

pub fn seconds_to_years_wad(seconds: u64) -> i128 {
    (seconds as i128) * WAD / (SECONDS_PER_YEAR as i128)
}
