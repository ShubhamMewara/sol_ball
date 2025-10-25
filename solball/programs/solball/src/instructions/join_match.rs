use anchor_lang::{prelude::*, system_program::{transfer, Transfer}};

use crate::USER_SUB_ACCOUNT;

#[derive(Accounts)]
pub struct Joinmatch<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"bank_account"],
        bump,
    )]
    pub bank_account: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn join_match<'info>(ctx: Context<'_, '_, '_, 'info, Joinmatch<'info>>, entry_fee: u64) -> Result<()> {
    let num_players = ctx.remaining_accounts.len();
    
    for i in 0..num_players {
        // Extract Player and Player Bump
        let player = &ctx.remaining_accounts[i];
        let (_expected_pda, bump) = Pubkey::find_program_address(
            &[b"user_sub_account", player.key().as_ref()],
            ctx.program_id,
        );
        
        let player_key = player.key();
        let signer_seeds: &[&[&[u8]]] = &[&[
            USER_SUB_ACCOUNT,
            player_key.as_ref(),
            &[bump]
        ]];

        let from_account = ctx.remaining_accounts[i].to_account_info();
        let to_account = ctx.accounts.bank_account.to_account_info();
        let system_program_account = ctx.accounts.system_program.to_account_info();

        let cpi_accounts = Transfer {
            from: from_account,
            to: to_account,
        };
        
        let cpi_ctx = CpiContext::new_with_signer(
            system_program_account,
            cpi_accounts,
            signer_seeds,
        );
        
        transfer(cpi_ctx, entry_fee)?;
        msg!("Locked in user funds to wallet!:{}")
    }

    Ok(())
}