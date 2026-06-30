use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum AurumError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidConfig = 3,
    InvalidPrice = 4,
    PriceNotSet = 5,
    InvalidAmount = 6,
    InsufficientCollateral = 7,
    NoPosition = 8,
    PositionHealthy = 9,
    DivisionByZero = 10,
}
