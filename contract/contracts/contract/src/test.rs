#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Env, String};

#[test]
fn test_create_and_get_plan() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let plan_id = String::from_str(&env, "plan-001");
    let unlock_time = env.ledger().timestamp() + 86400 * 30; // 30 days from now

    client.create_plan(&owner, &plan_id, &unlock_time);

    let plan = client.get_plan(&plan_id);
    assert_eq!(plan.owner, owner);
    assert_eq!(plan.unlock_time, unlock_time);
    assert!(plan.is_active);
    assert!(!plan.is_claimed);
}

#[test]
fn test_add_beneficiary() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let beneficiary1 = Address::generate(&env);
    let beneficiary2 = Address::generate(&env);
    let plan_id = String::from_str(&env, "plan-002");
    let unlock_time = env.ledger().timestamp() + 86400 * 30;

    client.create_plan(&owner, &plan_id, &unlock_time);
    client.add_beneficiary(&owner, &plan_id, &beneficiary1);
    client.add_beneficiary(&owner, &plan_id, &beneficiary2);

    let plan = client.get_plan(&plan_id);
    assert_eq!(plan.beneficiaries.len(), 2);
}

#[test]
fn test_add_assets() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let plan_id = String::from_str(&env, "plan-003");
    let unlock_time = env.ledger().timestamp() + 86400 * 30;
    let token1 = Address::generate(&env);
    let token2 = Address::generate(&env);

    client.create_plan(&owner, &plan_id, &unlock_time);
    client.add_asset(&owner, &plan_id, &token1, &1000i128);
    client.add_asset(&owner, &plan_id, &token2, &500i128);

    let plan = client.get_plan(&plan_id);
    assert_eq!(plan.assets.len(), 2);
}

#[test]
#[should_panic(expected = "not the plan owner")]
fn test_non_owner_cannot_add_beneficiary() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let non_owner = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let plan_id = String::from_str(&env, "plan-004");
    let unlock_time = env.ledger().timestamp() + 86400 * 30;

    client.create_plan(&owner, &plan_id, &unlock_time);
    client.add_beneficiary(&non_owner, &plan_id, &beneficiary);
}

#[test]
fn test_cancel_plan() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let plan_id = String::from_str(&env, "plan-005");
    let unlock_time = env.ledger().timestamp() + 86400 * 30;

    client.create_plan(&owner, &plan_id, &unlock_time);
    client.cancel_plan(&owner, &plan_id);

    let plan = client.get_plan(&plan_id);
    assert!(!plan.is_active);
}

#[test]
#[should_panic(expected = "plan not found")]
fn test_get_nonexistent_plan() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let plan_id = String::from_str(&env, "nonexistent");
    client.get_plan(&plan_id);
}
