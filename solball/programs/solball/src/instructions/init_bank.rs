use anchor_lang::prelude::{*};

#[derive(Accounts)]
pub struct InitBank<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(
        init,
        payer = admin,
        seeds = [b"bank_account"],
        bump,
        space = 8,
    )]
    pub bank_account: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

pub fn init_bank(_ctx: Context<InitBank>) -> Result<()> {
    // optionally store some metadata / mark as initialized
    msg!("Bank Account initialized successfully! {}");
    Ok(())
}
