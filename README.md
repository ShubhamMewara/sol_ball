# ⚽ Sol Ball

## 📝 Brief Description

**Sol Ball** is a real-time, physics-based multiplayer football game built on **Solana**, inspired by the classic **Haxball** experience.  
Players compete in fast-paced **3v3 matches**, deposit **SOL** to join, and earn **on-chain rewards** for winning.

The game integrates **Privy Wallet**, **Solana Programs**, and **WebSocket-powered multiplayer gameplay** — creating a seamless fusion of **Web3 and real-time gaming**.

---

## 🔗 Source Code

[GitHub Repository](https://github.com/ShubhamMewara/sol_ball)

## 🔗 Project Link

[solball.vercel.app](https://solball.vercel.app/)

---

## ✨ Core Features

### ⚽ Real-Time 3v3 Multiplayer

- Play against others in fast, physics-driven football matches.
- Real-time ball movement, collisions, and smooth latency handling.

### 💰 On-Chain Deposits & Rewards

- Deposit SOL directly from your wallet.
- Winning teams earn instant payouts on-chain.
- 20% of the reward pool goes to the game owner; 80% distributed to winners.

### 🔒 Privy Wallet Integration

- Secure authentication via Privy.io.
- Supports Solana wallets like Phantom, Solflare, and Backpack.

### 🧩 Lobby System

- Create or join 3v3 matches with custom names, entry fees, and visibility (Public/Private).
- Lobby owners can start or cancel matches.

### 🧠 Fair On-Chain Logic

- Escrow and settlement handled by a verified Anchor smart contract.
- Transparent match validation ensures fairness.

### 🎨 Clean UI/UX

- Built with Tailwind CSS and shadcn/ui.
- Responsive, minimal, and optimized for both desktop and mobile.

---

## ⚙️ Instructions

### 1. Connect Wallet

Log in securely using Privy or a Solana wallet.

### 2. Create or Join a Lobby

Choose your entry fee and join a 3v3 match.

### 3. Deposit Funds

Deposits are locked into an on-chain escrow until the match concludes.

### 4. Play the Game

Use **WASD** or **Arrow Keys** to move.  
Score goals, assist teammates, and outplay opponents in real time.

### 5. Match Settlement

Once the match ends: split among winners.

### 6. Withdraw Rewards

Instantly withdraw your balance anytime from your Solana sub-account.

---

## 🛠 Tech Stack

- **Next.js 14** (Frontend Framework)
- **React 19**
- **TypeScript**
- **Tailwind CSS + shadcn/ui** (UI Components)
- **WebSockets** (Real-time multiplayer gameplay)
- **Solana Web3.js** (Blockchain integration)
- **Anchor Framework** (Smart contract development)
- **Privy SDK** (Authentication & wallet connection)
- **Node.js Backend** (Lobby + game server)
- **Supabase** (Player sessions, matchmaking data)

---

## 🧩 Additional Features (Planned / Future Scope)

### 💬 Global Chat System

- Real-time global and lobby-specific chat using WebSockets.

### 🧑‍🤝‍🧑 Referral Program

- Unique referral codes to earn commissions when friends play.

### 🏆 Leaderboards

- Track top players based on wins, goals, and earnings.

### 🎨 Custom Avatars & Skins

- Player cosmetics purchasable using SOL or SPL tokens.

### 🧠 Matchmaking System

- Skill-based ranked matchmaking with seasonal rewards.

### 🪙 Multi-Token Support

- Allow deposits using SPL tokens beyond SOL.
