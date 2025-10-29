use anchor_lang::prelude::*;
use anchor_lang::{prelude::*, system_program::{transfer, Transfer}};

use crate::BANK_ACCOUNT;

#[derive(Accounts)]
pub struct SettleMatch<'info> {
    #[account(mut)]
    pub signer:Signer<'info>,
    #[account(
        mut,
        seeds=[b"user_sub_account", signer.key().as_ref()],
        bump
    )]
    pub user_sub_account:UncheckedAccount<'info>,
    #[account(
        mut,
        seeds=[b"bank_account"],
        bump
    )]
    pub bank_account:UncheckedAccount<'info>,
    pub system_program:Program<'info,System>,
}

pub fn settle_match<'info>(
    ctx: Context<'_, '_, '_, 'info, SettleMatch<'info>>,
    per_winner_share: u64,
) -> Result<()> {

    let winners = ctx.remaining_accounts.len();
    let bank = &mut ctx.accounts.bank_account.to_account_info();
    let system_program = &mut ctx.accounts.system_program;

    // Credit winners directly from bank PDA
    for i in 0..winners {
        let winner = &ctx.remaining_accounts[i];
        // Bank Account Seeds
         let (bank_pda, bump) = Pubkey::find_program_address(
            &[b"bank_account"],
            ctx.program_id,
        );
        let seeds:&[&[&[u8]]] = &[&[BANK_ACCOUNT,&[bump]]];
        // Create system transfer instruction from loser PDA to program for redistribution
        let cpi_ctx = CpiContext::new_with_signer(
        system_program.to_account_info(),
        Transfer {
            from: bank.to_account_info(),
            to: winner.to_account_info(),
        },
        seeds,
    );
         // execute the lamports transfer
        transfer(cpi_ctx, per_winner_share)?;
    }
    Ok(())
}
