pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;

declare_id!("4ddavkocvoin1ZTeJcHrgtZHjN3ETEhwPh3jWE26qV7U");

#[program]
pub mod solball {
    use super::*;

    pub fn deposit(ctx: Context<Deposit>, lamports:u64) -> Result<()> {
        instructions::deposit(ctx, lamports)?;
        Ok(())
    }
    pub fn withdraw(ctx:Context<Withdraw>, lamports:u64)-> Result<()>{
        instructions::withdraw(ctx, lamports)?;
        Ok(())
    }
    pub fn init_bank(ctx:Context<InitBank>)->Result<()>{
        instructions::init_bank(ctx)?;
        Ok(())
    }
    pub fn join_match<'info>(ctx: Context<'_, '_, '_, 'info, Joinmatch<'info>>, entry_fee: u64) -> Result<()> {
        instructions::join_match(ctx, entry_fee)
    }
    pub fn settle_match<'info>(ctx: Context<'_, '_, '_, 'info, SettleMatch<'info>>, winner_share:u64)->Result<()>{
        instructions::settle_match(ctx, winner_share)?;
        Ok(())
    }
}
