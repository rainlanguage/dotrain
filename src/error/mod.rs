/// Covers all errors variants of this library
#[derive(Debug)]
pub enum Error {
    FailedToParse,
    OutOfCharBoundry,
    StateUpdateFailed,
    NoDatabaseAttached,
    InvalidNumbericValue,
    DuplicateContextAliases,
    InvalidExpressionDeployerData,
    SerdeJsonError(serde_json::Error),
    AbiCoderError(alloy_sol_types::Error),
    ParseIntError(std::num::ParseIntError),
    UintParseError(alloy_primitives::ruint::ParseError),
    EVMError(revm::primitives::EVMError<std::convert::Infallible>),
}

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Error::OutOfCharBoundry => f.write_str("position is not within char boundry"),
            Error::StateUpdateFailed => f.write_str("failed to update parse state"),
            Error::FailedToParse => f.write_str("failed to parse, something went wrong"),
            Error::DuplicateContextAliases => f.write_str("includes duplicate context aliases"),
            Error::InvalidNumbericValue => f.write_str("does not follow rain numeric pattern and range"),
            Error::NoDatabaseAttached => f.write_str("evm instance has no database attached"),
            Error::InvalidExpressionDeployerData => {
                f.write_str("cannot reproduce the ExpressionDeployer from the given data")
            }
            Error::AbiCoderError(v) => write!(f, "{}", v),
            Error::SerdeJsonError(v) => write!(f, "{}", v),
            Error::UintParseError(v) => write!(f, "{}", v),
            Error::ParseIntError(v) => write!(f, "{}", v),
            Error::EVMError(v) => write!(f, "{}", v),
        }
    }
}

impl std::error::Error for Error {}

impl From<serde_json::Error> for Error {
    fn from(value: serde_json::Error) -> Self {
        Error::SerdeJsonError(value)
    }
}

impl From<alloy_sol_types::Error> for Error {
    fn from(value: alloy_sol_types::Error) -> Self {
        Error::AbiCoderError(value)
    }
}

impl From<alloy_primitives::ruint::ParseError> for Error {
    fn from(value: alloy_primitives::ruint::ParseError) -> Self {
        Error::UintParseError(value)
    }
}

impl From<std::num::ParseIntError> for Error {
    fn from(value: std::num::ParseIntError) -> Self {
        Error::ParseIntError(value)
    }
}

impl From<revm::primitives::EVMError<std::convert::Infallible>> for Error {
    fn from(value: revm::primitives::EVMError<std::convert::Infallible>) -> Self {
        Error::EVMError(value)
    }
}
