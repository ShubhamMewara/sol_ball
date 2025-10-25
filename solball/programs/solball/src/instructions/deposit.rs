use anchor_lang::{prelude::*, system_program::{transfer, Transfer}};

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub signer:Signer<'info>,
    #[account(
        init_if_needed,
        payer=signer,
        seeds=[b"user_sub_account", signer.key().as_ref()],
        space=8,
        bump
    )]
    pub user_sub_account:UncheckedAccount<'info>,
    pub system_program:Program<'info,System>

}

pub fn deposit(ctx: Context<Deposit>, lamports:u64) -> Result<()> {

    // deposit the user's fund to user sub account
    let cpi_context  = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
         Transfer {
            from:ctx.accounts.signer.to_account_info(),
            to:ctx.accounts.user_sub_account.to_account_info()
         }
        );
        transfer(cpi_context, lamports)?;
    Ok(())
}
