use anchor_lang::{prelude::*, system_program::{transfer, Transfer}};
use anchor_spl::token_2022::TransferChecked;

use crate::{error::ErrorCode, USER_SUB_ACCOUNT};

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub signer:Signer<'info>,
    #[account(
        mut,
        seeds=[b"user_sub_account", signer.key().as_ref()],
        bump
    )]
    pub user_sub_account:AccountInfo<'info>,
    pub system_program:Program<'info,System>

}

pub fn withdraw(ctx: Context<Withdraw>, lamports:u64) -> Result<()> {

    let signer_key = ctx.accounts.signer.key();
    // let (expected_pda, _bump) =
    //     Pubkey::find_program_address(&[b"user_sub_account", signer_key.as_ref()], ctx.program_id);
    // // Manual verification is REQUIRED when using AccountInfo/UncheckedAccount
    // require_keys_eq!(
    //     ctx.accounts.user_sub_account.key(),
    //     expected_pda,
    //     ErrorCode::InvalidSubAccount
    // );
    // let signer_seeds:&[&[&[u8]]] = &[&[USER_SUB_ACCOUNT,signer_key.as_ref(), &[ctx.bumps.user_sub_account]]];
    // ✅ CORRECT - Safe way to transfer lamports
    // **ctx.accounts.signer.to_account_info().try_borrow_mut_lamports()? -= lamports;
    // **ctx.accounts.user_sub_account.to_account_info().try_borrow_mut_lamports()? += lamports;

    // deposit the user's fund to user sub account
    let seeds = &[b"user_sub_account", signer_key.as_ref(), &[ctx.bumps.user_sub_account]];
    let signer_seeds = &[&seeds[..]];

     let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_sub_account.to_account_info(),
            to: ctx.accounts.signer.to_account_info(),
        },
        signer_seeds,
     );

        anchor_lang::system_program::transfer(cpi_ctx, lamports)?;

    Ok(())
}
