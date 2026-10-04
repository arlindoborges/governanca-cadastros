def test_register_and_login(client) -> None:
    register = client.post(
        "/api/v1/auth/register",
        json={"email": "usuario@example.com", "password": "senha1234", "full_name": "Usuário Teste"},
    )
    assert register.status_code == 200
    body = register.json()["data"]
    assert body["user"]["email"] == "usuario@example.com"
    assert body["access_token"]

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "usuario@example.com", "password": "senha1234"},
    )
    assert login.status_code == 200
    assert login.json()["data"]["user"]["full_name"] == "Usuário Teste"

    token = login.json()["data"]["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["data"]["email"] == "usuario@example.com"
