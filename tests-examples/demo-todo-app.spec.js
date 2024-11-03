
import { test, expect } from "@playwright/test";

test.describe.only("API challenge", () => {
  let URL = "https://apichallenges.herokuapp.com/";
  let token;


  test.beforeAll(async ({request}) => {
    // Запросить ключ авторизации
    let response = await request.post(`${URL}challenger`);
    let headers = response.headers();
    // Передаем токен в тест
    token = headers["x-challenger"];
    // Пример ассерта
    expect(headers).toEqual(
        expect.objectContaining({"x-challenger": expect.any(String)}),
    );

    console.log(token);
  });

  test("Отредактировать задание PUT /todos/{id} @PUT", async ({request}) => {

    let response = await request.put(`${URL}todos / 122222`, {
      headers: {
        "x-challenger": token,
      },
      data: todo,
    });

    let headers = response.headers();
    expect(response.status()).toBe(400);
    expect(headers).toEqual(expect.objectContaining({"x-challenger": token}));
  });
});