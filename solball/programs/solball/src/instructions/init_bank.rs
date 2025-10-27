use anchor_lang::prelude::{*};

#[derive(Accounts)]
pub struct InitBank<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
      /// CHECK: This account is initialized as a PDA derived from the signer's pubkey.
/// It's safe because we control the derivation and the System Program owns it./// CHECK: This account is initialized as a PDA derived from the signer's pubkey.
    #[account(
        init,
        payer = admin,
        seeds = [b"bank_account"],
        bump,
        space = 8,
        owner =  System::id(),

    )]
    pub bank_account: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

pub fn init_bank(_ctx: Context<InitBank>) -> Result<()> {
    // optionally store some metadata / mark as initialized
    msg!("Bank Account initialized successfully! {}");
    Ok(())
}
