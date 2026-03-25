#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec};

#[contracttype]
#[derive(Clone)]
pub struct Asset {
    pub token_address: Address,
    pub amount: i128,
}

#[contracttype]
#[derive(Clone)]
pub struct Plan {
    pub owner: Address,
    pub beneficiaries: Vec<Address>,
    pub assets: Vec<Asset>,
    pub unlock_time: u64,
    pub is_active: bool,
    pub is_claimed: bool,
}

#[contracttype]
pub enum DataKey {
    Plan(String),
    PlanIds,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn create_plan(env: Env, owner: Address, plan_id: String, unlock_time: u64) {
        owner.require_auth();
        assert!(
            unlock_time > env.ledger().timestamp(),
            "unlock time must be in the future"
        );

        let plan = Plan {
            owner: owner.clone(),
            beneficiaries: Vec::new(&env),
            assets: Vec::new(&env),
            unlock_time,
            is_active: true,
            is_claimed: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Plan(plan_id.clone()), &plan);

        // Track plan IDs
        let mut plan_ids: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::PlanIds)
            .unwrap_or_else(|| Vec::new(&env));
        plan_ids.push_back(plan_id);
        env.storage().persistent().set(&DataKey::PlanIds, &plan_ids);
    }

    pub fn add_beneficiary(env: Env, owner: Address, plan_id: String, beneficiary: Address) {
        owner.require_auth();
        let mut plan = Self::get_plan_internal(&env, &plan_id);

        assert_eq!(plan.owner, owner, "not the plan owner");
        assert!(plan.is_active, "plan is not active");
        assert!(!plan.is_claimed, "assets already claimed");

        plan.beneficiaries.push_back(beneficiary);
        env.storage()
            .persistent()
            .set(&DataKey::Plan(plan_id), &plan);
    }

    pub fn add_asset(
        env: Env,
        owner: Address,
        plan_id: String,
        token_address: Address,
        amount: i128,
    ) {
        owner.require_auth();
        let mut plan = Self::get_plan_internal(&env, &plan_id);

        assert_eq!(plan.owner, owner, "not the plan owner");
        assert!(plan.is_active, "plan is not active");
        assert!(!plan.is_claimed, "assets already claimed");
        assert!(amount > 0, "amount must be positive");

        let asset = Asset {
            token_address,
            amount,
        };
        plan.assets.push_back(asset);
        env.storage()
            .persistent()
            .set(&DataKey::Plan(plan_id), &plan);
    }

    pub fn claim(env: Env, caller: Address, plan_id: String) -> Vec<Asset> {
        caller.require_auth();
        let mut plan = Self::get_plan_internal(&env, &plan_id);

        assert!(plan.is_active, "plan is not active");
        assert!(!plan.is_claimed, "already claimed");
        assert!(
            env.ledger().timestamp() >= plan.unlock_time,
            "unlock time not reached"
        );

        // Check if caller is a beneficiary
        let mut is_beneficiary = false;
        for i in 0..plan.beneficiaries.len() {
            if let Some(b) = plan.beneficiaries.get(i) {
                if b == caller {
                    is_beneficiary = true;
                    break;
                }
            }
        }
        assert!(is_beneficiary, "not a beneficiary");

        // Mark as claimed and transfer assets
        plan.is_claimed = true;
        plan.is_active = false;
        env.storage()
            .persistent()
            .set(&DataKey::Plan(plan_id), &plan);

        // Transfer all assets to the caller
        let assets = plan.assets;
        for i in 0..assets.len() {
            if let Some(asset) = assets.get(i) {
                if asset.amount > 0 {
                    // Transfer token via cross-contract call
                    Self::transfer_token(
                        &env,
                        &asset.token_address,
                        &env.current_contract_address(),
                        &caller,
                        &asset.amount,
                    );
                }
            }
        }

        assets
    }

    pub fn cancel_plan(env: Env, owner: Address, plan_id: String) {
        owner.require_auth();
        let mut plan = Self::get_plan_internal(&env, &plan_id);

        assert_eq!(plan.owner, owner, "not the plan owner");
        assert!(!plan.is_claimed, "already claimed");

        plan.is_active = false;
        env.storage()
            .persistent()
            .set(&DataKey::Plan(plan_id), &plan);
    }

    pub fn get_plan(env: Env, plan_id: String) -> Plan {
        Self::get_plan_internal(&env, &plan_id)
    }

    pub fn get_all_plan_ids(env: Env) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::PlanIds)
            .unwrap_or_else(|| Vec::new(&env))
    }

    fn get_plan_internal(env: &Env, plan_id: &String) -> Plan {
        env.storage()
            .persistent()
            .get(&DataKey::Plan(plan_id.clone()))
            .expect("plan not found")
    }

    fn transfer_token(
        env: &Env,
        token_addr: &Address,
        from: &Address,
        to: &Address,
        amount: &i128,
    ) {
        use soroban_sdk::token;
        let client = token::Client::new(env, token_addr);
        client.transfer(from, to, amount);
    }
}

mod test;
