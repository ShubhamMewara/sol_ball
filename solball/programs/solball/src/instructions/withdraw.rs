use anchor_lang::{prelude::*, system_program::{transfer, Transfer}};
use anchor_spl::token_2022::TransferChecked;

use crate::USER_SUB_ACCOUNT;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub signer:Signer<'info>,
    #[account(
        mut,
        seeds=[b"user_sub_account", signer.key().as_ref()],
        bump
    )]
    pub user_sub_account:UncheckedAccount<'info>,
    pub system_program:Program<'info,System>

}

pub fn withdraw(ctx: Context<Withdraw>, lamports:u64) -> Result<()> {
    let signer_key = ctx.accounts.signer.key();

    let signer_seeds:&[&[&[u8]]] = &[&[USER_SUB_ACCOUNT,signer_key.as_ref(), &[ctx.bumps.user_sub_account]]];
    // deposit the user's fund to user sub account
    let cpi_context  = CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
         Transfer {
            from:ctx.accounts.user_sub_account.to_account_info(),
            to:ctx.accounts.signer.to_account_info()
         },
         signer_seeds
        );
        transfer(cpi_context, lamports)?;
    Ok(())
}
