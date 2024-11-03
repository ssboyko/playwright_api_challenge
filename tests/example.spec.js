import {test, expect} from "@playwright/test";
import {parseStringPromise} from "xml2js";
import data from "../tests/data.js";


test.describe("API challenge", () => {
    let URL = "https://apichallenges.herokuapp.com/";
    let token;
    let xAuthToken;
    const xmlData = `
<todo>
    <doneStatus>true</doneStatus>
    <title>file paperwork today</title>
    <description>Complete the paperwork by end of day</description>
</todo>`;
    const jsonData = {
        "title": "create todo process payroll",
        "doneStatus": true,
        "description": "test"
    };

    test.beforeAll('01. Issue a POST request on the `/challenger`. ' +
        'For getting X-CHALLENGER header in future requests to track challenge completion.', async ({request}) => {
        // Request authorization key
        let response = await request.post(`${URL}challenger`);
        let headers = response.headers();
        // Pass the token to the tests
        token = headers["x-challenger"];
        console.log('This is the token: ' + token);

        expect(headers).toEqual(
            expect.objectContaining({"x-challenger": expect.any(String)}),
        );
    });

    test("02. Issue a GET request on the `/challenges` end point", async ({request}) => {
        let response = await request.get(`${URL}challenges`, {
            headers: {
                "x-challenger": token,
            },
        });
        let body = await response.json();
        let headers = await response.headers();
        expect(response.status()).toBe(200);
        expect(headers).toEqual(expect.objectContaining({"x-challenger": token}));
        console.log(token);
        expect(body.challenges.length).toBe(59);
    });

    test("03. Issue a GET request on the `/todos` end point", async ({request}) => {
        const response = await request.get(`${URL}todos`, {
            headers: {
                "x-challenger": token,
            },
        });
        const resp = await response.json();
        expect(resp.todos[0].title).toEqual(expect.any(String));
    });

    test("04. Issue a GET request on the `/todo` end point should 404 because nouns should be plural", async ({request}) => {
        const response = await request.get(`${URL}todo`, {
            headers: {
                "x-challenger": token,
            },
        });
        expect(response.status()).toBe(404);
    });

    test("05. Issue a GET request on the `/todos/{id}` end point to return a specific todo", async ({request}) => {
        const response = await request.get(`${URL}todos/1`, {
            headers: {
                "x-challenger": token,
            },
        });
        expect(response.status()).toBe(200);
        const resp = await response.json();
        expect(resp.todos[0].title).toEqual(expect.any(String));
    });

    test("06. Issue a GET request on the `/todos/{id}` end point for a todo that does not exist", async ({request}) => {
        const response = await request.get(`${URL}todos/12345`, {
            headers: {
                "x-challenger": token,
            },
        });
        expect(response.status()).toBe(404);
    });


    test("07 + 09. Create a todo and then issue a GET request on the `/todos` end point with a query filter to get only todos which are 'done'.", async ({request}) => {
        // Step 1: Create a todo
        await test.step("09. Issue a POST request to successfully create a todo", async () => {
            const response = await request.post(`${URL}todos`, {
                headers: {
                    "x-challenger": token,
                    "Content-Type": "application/json"
                },
                data: {
                    "title": "create todo process payroll",
                    "doneStatus": true,
                    "description": "test"
                }
            });
            let resp = await response.json();
            console.log(resp);
            expect(response.status()).toBe(201);
        });

        // Step 2: Issue a GET request with a query filter
        await test.step("07. Issue a GET request on the `/todos` end point with a query filter to get only todos which are 'done'", async () => {
            const response = await request.get(`${URL}todos?doneStatus=true`, {
                headers: {
                    "x-challenger": token,
                },
            });
            let resp = await response.json();
            console.log(resp);
            expect(response.status()).toBe(200);
        });
    });

    test("08. Issue a HEAD request on the `/todos` end point", async ({request}) => {
        const response = await request.head(`${URL}todos`, {
            headers: {
                "x-challenger": token,
            },
        });
        expect(response.status()).toBe(200);
    });

    test("10. Issue a POST request to create a todo but fail validation on the `doneStatus` field", async ({request}) => {
        const response = await request.post(`${URL}todos`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json"
            },
            data: {
                "title": "create todo process payroll",
                "doneStatus": "test",
                "description": ""
            }
        });
        let resp = await response.json();
        console.log(resp);
        expect(response.status()).toBe(400);
        expect(resp.errorMessages).toContain("Failed Validation: doneStatus should be BOOLEAN but was STRING");
    });

    test("11. Issue a POST request to create a todo but fail length validation " +
        "on the `title` field because your title exceeds maximum allowable characters.", async ({request}) => {
        const title = 'a'.repeat(51)
        const response = await request.post(`${URL}todos`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json"
            },
            data: {
                "title": title,
                "doneStatus": true,
                "description": ""
            }
        });
        let resp = await response.json();
        console.log(resp);
        expect(response.status()).toBe(400);
        expect(resp.errorMessages).toContain("Failed Validation: Maximum allowable length exceeded for title - maximum allowed is 50");
    });

    test("12. Issue a POST request to create a todo but fail length validation " +
        "on the `title` field because your title exceeds maximum allowable characters.", async ({request}) => {
        const description = 'a'.repeat(201)
        const response = await request.post(`${URL}todos`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json"
            },
            data: {
                "title": "create todo process payroll",
                "doneStatus": true,
                "description": description
            }
        });
        let resp = await response.json();
        console.log(resp);
        expect(response.status()).toBe(400);
        expect(resp.errorMessages).toContain("Failed Validation: Maximum allowable length exceeded for description - maximum allowed is 200");
    });

    test("13. Issue a POST request to create a todo with maximum length title and description fields.", async ({request}) => {
        const title = 'a'.repeat(50)
        const description = 'a'.repeat(200)
        const response = await request.post(`${URL}todos`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json"
            },
            data: {
                "title": title,
                "doneStatus": true,
                "description": description
            }
        });
        let resp = await response.json();
        console.log(resp);
        expect(response.status()).toBe(201);
    });

    test("14. Issue a POST request to create a todo but fail payload length validation on the `description` because your whole payload exceeds maximum allowable 5000 characters.", async ({request}) => {
        const title = 'a'.repeat(50)
        const description = 'a'.repeat(5000)
        const response = await request.post(`${URL}todos`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json"
            },
            data: {
                "title": title,
                "doneStatus": true,
                "description": description,
                "priority": 1
            }
        });
        let resp = await response.json();
        console.log(resp);
        expect(response.status()).toBe(413);
        expect(resp.errorMessages).toContain("Error: Request body too large, max allowed is 5000 bytes");
    });

    test("15. Issue a POST request to create a todo but fail validation because your payload contains an unrecognised field.", async ({request}) => {
        const title = 'a'.repeat(50)
        const description = 'a'.repeat(100)
        const response = await request.post(`${URL}todos`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json"
            },
            data: {
                "title": title,
                "doneStatus": true,
                "description": description,
                "priority": 1
            }
        });
        let resp = await response.json();
        console.log(resp);
        expect(response.status()).toBe(400);
        expect(resp.errorMessages).toContain("Could not find field: priority");
    });

    test("16. Issue a PUT request to unsuccessfully create a todo", async ({request}) => {
        const response = await request.put(`${URL}todos/22222`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json"
            },
            data: {
                "id": 1,
                "title": "scan paperwork",
                "doneStatus": false,
                "description": ""
            }
        });
        let resp = await response.json();
        console.log(resp);
        expect(response.status()).toBe(400);
        expect(resp.errorMessages).toContain("Cannot create todo with PUT due to Auto fields id");
    });

    test("17. Issue a POST request to successfully update a todo", async ({request}) => {
        const response = await request.post(`${URL}todos/1`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json"
            },
            data: {
                "title": "scan paperwork"
            }
        });
        let resp = await response.json();
        console.log(resp);
        expect(response.status()).toBe(200);
        expect(resp.title).toContain("scan paperwork");
    });

    test("18. Issue a POST request for a todo which does not exist. Expect to receive a 404 response.", async ({request}) => {
        const response = await request.post(`${URL}todos/1111`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json"
            },
            data: {
                "title": "scan paperwork"
            }
        });
        let resp = await response.json();
        console.log(resp);
        expect(response.status()).toBe(404);
        expect(resp.errorMessages).toContain("No such todo entity instance with id == 1111 found");
    });

    test("19. Issue a PUT request to update an existing todo with a complete payload i.e. title, description and donestatus.", async ({request}) => {
        const response = await request.put(`${URL}todos/1`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json"
            },
            data: {
                "title": "scan paperwork",
                "doneStatus": false,
                "description": ""
            }
        });
        let resp = await response.json();
        console.log(resp);
        expect(response.status()).toBe(200);
        expect(resp.title).toContain("scan paperwork");
    });

    test("20. Issue a PUT request to update an existing todo with just mandatory items in payload i.e. title.", async ({request}) => {
        const response = await request.put(`${URL}todos/1`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json"
            },
            data: {
                "title": "scan paperwork",
            }
        });
        let resp = await response.json();
        console.log(resp);
        expect(response.status()).toBe(200);
        expect(resp.title).toContain("scan paperwork");
    });

    test("21. Issue a PUT request to fail to update an existing todo because title is missing in payload.", async ({request}) => {
        const title = 'a'.repeat(50)
        const description = 'a'.repeat(50)
        const response = await request.put(`${URL}todos/1`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json"
            },
            data: {
                "id": 1
            }
        });
        let resp = await response.json();
        console.log(resp);
        expect(response.status()).toBe(400);
        expect(resp.errorMessages).toContain("title : field is mandatory");
    });

    test("22. Issue a PUT request to fail to update an existing todo because id different in payload.", async ({request}) => {
        const response = await request.put(`${URL}todos/1`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json"
            },
            data: {
                "id": 2
            }
        });
        let resp = await response.json();
        console.log(resp);
        expect(response.status()).toBe(400);
        expect(resp.errorMessages).toContain("Can not amend id from 1 to 2");
    });

    test("23. Issue a DELETE request to successfully delete a todo", async ({request}) => {
        let todoId;
        await test.step("Step 1: Create a todo before deleting", async () => {
            const response = await request.post(`${URL}todos`, {
                headers: {
                    "x-challenger": token,
                    "Content-Type": "application/json"
                },
                data: jsonData
            });
            let resp = await response.json();
            console.log(resp);
            expect(response.status()).toBe(201);
            todoId = resp.id; // Save the id of the created todo
        });
        await test.step("Step 2: Delete todo created at Step 1", async () => {
            const response = await request.delete(`${URL}todos/${todoId}`, {
                headers: {
                    "x-challenger": token,
                },
            });
            expect(response.status()).toBe(200);
        });
        await test.step("Step 3: Check it was deleted by issuing a GET on the `/todos/{id}`", async () => {
            const response = await request.get(`${URL}todos/${todoId}`, {
                headers: {
                    "x-challenger": token,
                },
            });
            expect(response.status()).toBe(404);
        });
    });

    test("24. Issue an OPTIONS request on the `/todos` end point. You might want to manually check the 'Allow' header in the response is as expected.", async ({request}) => {
        const response = await request.fetch(`${URL}todos`, {
            method: 'OPTIONS',
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json"
            },
        });
        console.log(await response.text());
        expect(response.status()).toBe(200);
    });

    test("25. Issue a GET request on the `/todos` end point with an `Accept` header of `application/xml` to receive results in XML format", async ({request}) => {
        const response = await request.get(`${URL}todos`, {
            headers: {
                "x-challenger": token,
                "Accept": "application/xml"
            },
        });
        const xmlText = await response.text(); // Assign response text to xmlText
        console.log(xmlText);
        expect(response.status()).toBe(200);

        // Parse the XML response
        const result = await parseStringPromise(xmlText);

        // Verify the business fields
        const todos = result.todos.todo;
        expect(todos).toBeInstanceOf(Array);
        todos.forEach(todo => {
            expect(todo.doneStatus[0]).toMatch(/true|false/);
            expect(todo.description[0]).toEqual(expect.any(String));
            expect(todo.id[0]).toEqual(expect.any(String));
            expect(todo.title[0]).toEqual(expect.any(String));
        });
    });

    test("26. Issue a GET request on the `/todos` end point with an `Accept` header of `application/json` to receive results in JSON format", async ({request}) => {
        const response = await request.get(`${URL}todos`, {
            headers: {
                "x-challenger": token,
                "Accept": "application/json"
            },
        });
        let resp = await response.json();
        console.log(resp);
        expect(response.status()).toBe(200);

        const todo = resp.todos[0];
        expect(todo).toHaveProperty("id");
        expect(todo).toHaveProperty("title");
    });

    test("27. Issue a GET request on the `/todos` end point with an `Accept` header of `*/*` to receive results in default JSON format", async ({request}) => {
        const response = await request.get(`${URL}todos`, {
            headers: {
                "x-challenger": token,
                "Accept": "*/*"
            },
        });
        let resp = await response.json();
        console.log(resp);
        expect(response.status()).toBe(200);

        const todo = resp.todos[0];
        expect(todo).toHaveProperty("id");
        expect(todo).toHaveProperty("title");
    });

    test("28. Issue a GET request on the `/todos` end point with an `Accept` header of `application/xml, application/json` to receive results in the preferred XML format", async ({request}) => {
        const response = await request.get(`${URL}todos`, {
            headers: {
                "x-challenger": token,
                "Accept": "application/xml, application/json"
            },
        });

        const xmlText = await response.text(); // Assign response text to xmlText
        console.log(xmlText);
        expect(response.status()).toBe(200);

        // Parse the XML response
        const result = await parseStringPromise(xmlText);

        // Verify the business fields
        const todos = result.todos.todo;
        expect(todos).toBeInstanceOf(Array);
        todos.forEach(todo => {
            expect(todo.doneStatus[0]).toMatch(/true|false/);
            expect(todo.description[0]).toEqual(expect.any(String));
            expect(todo.id[0]).toEqual(expect.any(String));
            expect(todo.title[0]).toEqual(expect.any(String));
        });
    });

    test("29. Issue a GET request on the `/todos` end point with no `Accept` header present in the message to receive results in default JSON format", async ({request}) => {
        const response = await request.get(`${URL}todos`, {
            headers: {
                "x-challenger": token,
                "Accept": "",
            },
        });
        let resp = await response.json();
        console.log(resp);
        expect(response.status()).toBe(200);

        const todo = resp.todos[0];
        expect(todo).toHaveProperty("id");
        expect(todo).toHaveProperty("title");
    });

    test("30. Issue a GET request on the `/todos` end point with an `Accept` header `application/gzip` to receive 406 'NOT ACCEPTABLE' status code", async ({request}) => {
        const response = await request.get(`${URL}todos`, {
            headers: {
                "x-challenger": token,
                "Accept": "application/gzip",
            },
        });
        let resp = await response.json();
        console.log(resp);
        expect(response.status()).toBe(406);
        expect(resp.errorMessages).toContain("Unrecognised Accept Type");
    });

    test("31. Issue a POST request on the `/todos` end point to create a todo using Content-Type `application/xml`, and Accepting only XML ie. Accept header of `application/xml`", async ({request}) => {
        const response = await request.post(`${URL}todos`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/xml",
                "Accept": "application/xml",
            },
            data: xmlData,
        });

        const xmlText = await response.text();
        console.log(xmlText);
        expect(response.status()).toBe(201);

        // Parse the XML response
        const result = await parseStringPromise(xmlText);

        // Verify the business fields
        const todo = result.todo;
        expect(todo.doneStatus[0]).toMatch(/true|false/);
        expect(todo.title[0]).toEqual(expect.any(String));
        expect(todo.description[0]).toEqual(expect.any(String));
    });

    test("32. Issue a POST request on the `/todos` end point to create a todo using Content-Type `application/json`, and Accepting only JSON ie. Accept header of `application/json`", async ({request}) => {
        const response = await request.post(`${URL}todos`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            data: jsonData,
        });

        const jsonReso = await response.json();
        console.log(jsonReso);
        expect(response.status()).toBe(201);
        expect(jsonReso.title).toEqual(expect.any(String));
    });

    test("33. Issue a POST request on the `/todos` end point with an unsupported content type to generate a 415 status code", async ({request}) => {
        const response = await request.post(`${URL}todos`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "test",
                "Accept": "application/json",
            },
            data: jsonData,
        });

        const jsonResp = await response.json();
        console.log(jsonResp);
        expect(response.status()).toBe(415);
        expect(jsonResp.errorMessages).toContain("Unsupported Content Type - test");
    });

    test("34. Issue a GET request on the `/challenger/{guid}` end point, with an existing challenger GUID. " +
        "This will return the progress data payload that can be used to later restore your progress to this status.", async ({request}) => {
        const response = await request.get(`${URL}challenger/${token}`, {
            headers: {
                "x-challenger": token,
                "Accept": "application/json",
            }
        });

        const jsonResp = await response.json();
        console.log(jsonResp);
        expect(response.status()).toBe(200);
        expect(typeof jsonResp.challengeStatus.POST_TODOS_415).toBe("boolean");
    });

    test("35. Issue a PUT request on the `/challenger/{guid}` end point, with an existing challenger GUID to restore that challenger's progress into memory.", async ({request}) => {
        let challengerProgress;
        await test.step("Issue a GET request on the `/challenger/{guid}` end point, with an existing challenger GUID", async () => {
            const response = await request.get(`${URL}challenger/${token}`, {
                headers: {
                    "x-challenger": token,
                    "Accept": "application/json",
                }
            });

            const jsonResp = await response.json();
            console.log(jsonResp);
            expect(response.status()).toBe(200);
            expect(typeof jsonResp.challengeStatus.POST_TODOS_415).toBe("boolean");

            // Store the challenger progress
            challengerProgress = jsonResp;
        });

        await test.step("Issue a PUT request on the `/challenger/{guid}`", async () => {
            const response = await request.put(`${URL}challenger/${token}`, {
                headers: {
                    "x-challenger": token,
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                data: challengerProgress
            });

            expect(response.status()).toBe(200);
        });
    });

    test("36. Issue a PUT request on the `/challenger/{guid}` end point, with a challenger GUID not currently in memory to restore that challenger's progress into memory.", async ({request}) => {
        data.xChallenger = token;
        data.challengeStatus.PUT_NEW_RESTORED_CHALLENGER_PROGRESS_STATUS = true;

        const response = await request.put(`${URL}challenger/${token}`, {
            headers: {
                "x-challenger": token,
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            data: JSON.stringify(data)
        });
        const jsonResp = await response.json();
        console.log(jsonResp);
        expect(response.status()).toBe(200);
        expect(jsonResp.challengeStatus.PUT_NEW_RESTORED_CHALLENGER_PROGRESS_STATUS).toBe(true);
    });

    test("37. Issue a GET request on the `/challenger/database/{guid}` end point, to retrieve the current todos database for the user. You can use this to restore state later.", async ({request}) => {
        const response = await request.get(`${URL}challenger/database/${token}`, {
            headers: {
                "x-challenger": token,
                "Accept": "application/json",
                "Content-Type": "application/json"
            }
        });
        const jsonResp = await response.json();
        console.log(jsonResp);
        expect(response.status()).toBe(200);
    });

    test("38. Issue a PUT request on the `/challenger/database/{guid}` end point, with a payload to restore the Todos database in memory.", async ({request}) => {
        const response = await request.get(`${URL}challenger/database/${token}`, {
            headers: {
                "x-challenger": token,
                "Accept": "application/json",
                "Content-Type": "application/json"
            }
        });
        const jsonResp = await response.json();
        console.log(jsonResp);
        expect(response.status()).toBe(200);
        let modifiedRequest = jsonResp;
        modifiedRequest.todos[0].title = "test";

        const secondResponse = await request.put(`${URL}challenger/database/${token}`, {
            headers: {
                "x-challenger": token,
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            data: JSON.stringify(modifiedRequest)
        });
        expect(secondResponse.status()).toBe(204);
    });

    test("39. Issue a POST request on the `/todos` end point to create a todo " +
        "using Content-Type `application/xml` but Accept `application/json`", async ({request}) => {
        const response = await request.post(`${URL}todos`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/xml",
                "Accept": "application/json",
            },
            data: xmlData,
        });

        const jsonResp = await response.json();
        console.log(jsonResp);
        expect(response.status()).toBe(201);
        expect(jsonResp.title).toEqual(expect.any(String));
    });

    test("40. Issue a POST request on the `/todos` end point to create a todo using Content-Type `application/json` but Accept `application/xml`", async ({request}) => {
        const response = await request.post(`${URL}todos`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json",
                "Accept": "application/xml",
            },
            data: jsonData,
        });

        const xmlText = await response.text();
        console.log(xmlText);
        expect(response.status()).toBe(201);

        // Parse the XML response
        const result = await parseStringPromise(xmlText);

        // Verify the business fields
        const todo = result.todo;
        expect(todo.doneStatus[0]).toMatch(/true|false/);
        expect(todo.title[0]).toEqual(expect.any(String));
        expect(todo.description[0]).toEqual(expect.any(String));
    });

    test("41. Issue a DELETE request on the `/heartbeat` end point and receive 405 (Method Not Allowed)", async ({request}) => {
        const response = await request.delete(`${URL}heartbeat`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json",
            },
            data: jsonData,
        });
        expect(response.status()).toBe(405);

    });

    test("42. Issue a PATCH request on the `/heartbeat` end point and receive 500 (internal server error)", async ({request}) => {
        const response = await request.patch(`${URL}heartbeat`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json",
            },
            data: jsonData,
        });
        expect(response.status()).toBe(500);
    });

    test("43. Issue a TRACE request on the `/heartbeat` end point and receive 501 (Not Implemented)", async ({request}) => {
        const response = await request.fetch(`${URL}heartbeat`, {
            method: 'TRACE',
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json",
            },
            data: jsonData,
        });
        expect(response.status()).toBe(501);
    });

    test("44. Issue a GET request on the `/heartbeat` end point and receive 204 when server is running", async ({request}) => {
        const response = await request.get(`${URL}heartbeat`, {
            method: 'TRACE',
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json",
            },
            data: jsonData,
        });
        expect(response.status()).toBe(204);
    });

    test("45. Issue a POST request on the `/heartbeat` end point and receive 405 when you override the Method Verb to a DELETE", async ({request}) => {
        const response = await request.post(`${URL}heartbeat`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json",
                "X-HTTP-Method-Override": "DELETE"
            },
            data: jsonData,
        });
        expect(response.status()).toBe(405);
    });

    test("46. Issue a POST request on the `/heartbeat` end point and receive 500 when you override the Method Verb to a PATCH", async ({request}) => {
        const response = await request.post(`${URL}heartbeat`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json",
                "X-HTTP-Method-Override": "PATCH"
            },
            data: jsonData,
        });
        expect(response.status()).toBe(500);
    });

    test("47. Issue a POST request on the `/heartbeat` end point and receive 501 (Not Implemented) when you override the Method Verb to a TRACE", async ({request}) => {
        const response = await request.post(`${URL}heartbeat`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json",
                "X-HTTP-Method-Override": "TRACE"
            },
            data: jsonData,
        });
        expect(response.status()).toBe(501);
    });

    test("48. Issue a POST request on the `/secret/token` end point and receive 401 when Basic auth username/password is not admin/password", async ({request}) => {
        let response = await request.post(`${URL}secret/token`, {
            headers: {
                "x-challenger": token,
                "authorization": "Basic YWRtaW46cGFzc3dvcmRk"
            }
        });
        let headers = response.headers();
        expect(response.status()).toBe(401);
        expect(headers["x-challenger"]).toEqual(token);
    });

    test("49. Issue a POST request on the `/secret/token` end point and receive 201 when Basic auth username/password is admin/password", async ({request}) => {
        let response = await request.post(`${URL}secret/token`, {
            headers: {
                "x-challenger": token,
                "authorization": "Basic YWRtaW46cGFzc3dvcmQ="
            }
        });
        let headers = response.headers();
        xAuthToken = headers["x-auth-token"];
        expect(response.status()).toBe(201);
        expect(headers["x-challenger"]).toEqual(token);
    });

    test("50. Issue a GET request on the `/secret/note` end point and receive 403 when X-AUTH-TOKEN does not match a valid token", async ({request}) => {
        let response = await request.get(`${URL}secret/note`, {
            headers: {
                "x-challenger": token,
                "x-auth-token": "test"
            }
        });
        let headers = response.headers();
        expect(response.status()).toBe(403);
        expect(headers["x-challenger"]).toEqual(token);
    });

    test("51. Issue a GET request on the `/secret/note` end point and receive 401 when no X-AUTH-TOKEN header present", async ({request}) => {
        let response = await request.get(`${URL}secret/note`, {
            headers: {
                "x-challenger": token,
            }
        });
        let headers = response.headers();
        expect(response.status()).toBe(401);
        expect(headers["x-challenger"]).toEqual(token);
    });

    test("52. Issue a GET request on the `/secret/note` end point receive 200 when valid X-AUTH-TOKEN used - response body should contain the note", async ({request}) => {
        await test.step("get x-auth-token", async () => {
            let response = await request.post(`${URL}secret/token`, {
                headers: {
                    "x-challenger": token,
                    "authorization": "Basic YWRtaW46cGFzc3dvcmQ="
                }
            });
            let headers = response.headers();
            xAuthToken = headers["x-auth-token"];
            expect(response.status()).toBe(201);
            expect(headers["x-challenger"]).toEqual(token);
            console.log('xAuthToken is ' + xAuthToken);
        });

        await test.step('GET request on the `/secret/note` end point receive 200 when valid X-AUTH-TOKEN', async () => {
            console.log('xAuthToken is ' + xAuthToken);
            let response = await request.get(`${URL}secret/note`, {
                headers: {
                    "x-challenger": token,
                    "X-AUTH-TOKEN": xAuthToken
                }
            });

            let headers = response.headers();
            let body = await response.json();
            console.log(body);
            expect(response.status()).toBe(200);
            expect(headers["x-challenger"]).toEqual(token);
        });
    });

    test("53. Issue a POST request on the `/secret/note` end point with a note payload e.g. {\"note\":\"my note\"} " +
        "and receive 200 when valid X-AUTH-TOKEN used. Note is maximum length 100 chars and will be truncated when stored.", async ({request}) => {
        await test.step("get x-auth-token", async () => {
            let response = await request.post(`${URL}secret/token`, {
                headers: {
                    "x-challenger": token,
                    "authorization": "Basic YWRtaW46cGFzc3dvcmQ="
                }
            });
            let headers = response.headers();
            xAuthToken = headers["x-auth-token"];
            expect(response.status()).toBe(201);
            expect(headers["x-challenger"]).toEqual(token);
            console.log('xAuthToken is ' + xAuthToken);
        });

        await test.step('GET request on the `/secret/note` end point receive 200 when valid X-AUTH-TOKEN', async () => {
            let note = {"note": "my note"}
            let response = await request.post(`${URL}secret/note`, {
                headers: {
                    "x-challenger": token,
                    "X-AUTH-TOKEN": xAuthToken,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                data: JSON.stringify(note)
            });

            let headers = response.headers();
            let body = await response.json();
            console.log(body);
            expect(response.status()).toBe(200);
            expect(headers["x-challenger"]).toEqual(token);
        });
    });

    test("54. Issue a POST request on the `/secret/note` end point with a note payload {\"note\":\"my note\"} and receive 401 when no X-AUTH-TOKEN present", async ({request}) => {
        await test.step("get x-auth-token", async () => {
            let response = await request.post(`${URL}secret/token`, {
                headers: {
                    "x-challenger": token,
                    "authorization": "Basic YWRtaW46cGFzc3dvcmQ="
                }
            });
            let headers = response.headers();
            xAuthToken = headers["x-auth-token"];
            expect(response.status()).toBe(201);
            expect(headers["x-challenger"]).toEqual(token);
            console.log('xAuthToken is ' + xAuthToken);
        });

        await test.step('GET request on the `/secret/note` end point receive 200 when valid X-AUTH-TOKEN', async () => {
            let note = {"note": "my note"}
            let response = await request.post(`${URL}secret/note`, {
                headers: {
                    "x-challenger": token,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                data: JSON.stringify(note)
            });

            expect(response.status()).toBe(401);
        });
    });

    test("55. Issue a POST request on the `/secret/note` end point with a note payload {\"note\":\"my note\"} and receive 403 when X-AUTH-TOKEN does not match a valid token", async ({request}) => {
        let note = {"note": "my note"}
        let response = await request.post(`${URL}secret/note`, {
            headers: {
                "x-challenger": token,
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-AUTH-TOKEN": "test"
            },
            data: JSON.stringify(note)
        });

        expect(response.status()).toBe(403);
    });

    test("56. Issue a GET request on the `/secret/note` end point receive 200 when using the X-AUTH-TOKEN value as an Authorization Bearer token - response body should contain the note", async ({request}) => {
        await test.step("get x-auth-token", async () => {
            let response = await request.post(`${URL}secret/token`, {
                headers: {
                    "x-challenger": token,
                    "authorization": "Basic YWRtaW46cGFzc3dvcmQ="
                }
            });
            let headers = response.headers();
            xAuthToken = headers["x-auth-token"];
            expect(response.status()).toBe(201);
            expect(headers["x-challenger"]).toEqual(token);
            console.log('xAuthToken is ' + xAuthToken);
        });

        await test.step('GET request on the `/secret/note` end point receive 200 when valid X-AUTH-TOKEN', async () => {
            let note = {"note": "my note"}
            let response = await request.get(`${URL}secret/note`, {
                headers: {
                    "x-challenger": token,
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${xAuthToken}`
                },
                data: JSON.stringify(note)
            });

            expect(response.status()).toBe(200);
        });
    });

    test("57. Issue a POST request on the `/secret/note` end point with a note payload e.g. {\"note\":\"my note\"} and receive 200 when valid X-AUTH-TOKEN value used as an Authorization Bearer token. Status code 200 received.", async ({request}) => {
        let note = {"note": "my note"};
        await test.step("get x-auth-token", async () => {
            let response = await request.post(`${URL}secret/token`, {
                headers: {
                    "x-challenger": token,
                    "authorization": "Basic YWRtaW46cGFzc3dvcmQ="
                }
            });
            let headers = response.headers();
            xAuthToken = headers["x-auth-token"];
            expect(response.status()).toBe(201);
            expect(headers["x-challenger"]).toEqual(token);
            console.log('xAuthToken is ' + xAuthToken);
        });

        await test.step('POST                                                                                                                                                                                                                                                                                                    request on the `/secret/note` end point receive 200 when valid X-AUTH-TOKEN', async () => {
            let response = await request.post(`${URL}secret/note`, {
                headers: {
                    "x-challenger": token,
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${xAuthToken}`
                },
                data: JSON.stringify(note)
            });
            expect(response.status()).toBe(200);
        });
    });

    test('58. Issue a DELETE request to successfully delete the last todo in system so that there are no more todos in the system', async ({ request }) => {
        test.setTimeout(60000); // Increase the timeout to 60 seconds

        let responseTodos = await request.get(`${URL}todos`, {
            headers: {
                "x-challenger": token,
            },
        });

        let todos = (await responseTodos.json())['todos'];
        console.log(todos);
        for (let i = 0; i < todos.length; i++) {
            let idNumber = todos[i]['id'];
            await request.delete(`${URL}todos/${idNumber}`, {
                headers: {
                    "x-challenger": token,
                },
            });
            console.log('Deleted todo with id: ' + idNumber);
        }

        // Verify that all todos have been deleted
        responseTodos = await request.get(`${URL}todos`, {
            headers: {
                "x-challenger": token,
            },
        });
        todos = (await responseTodos.json())['todos'];
        expect(todos.length).toBe(0);
    });

    test("59. Issue as many POST requests as it takes to add the maximum number of TODOS allowed for a user (20)", async ({ request }) => {
        const maxTodos = 15;
        const todoData = {
            "title": "Sample Todo",
            "doneStatus": false,
            "description": "This is a sample todo"
        };

        for (let i = 0; i < maxTodos; i++) {
            const response = await request.post(`${URL}todos`, {
                headers: {
                    "x-challenger": token,
                    "Content-Type": "application/json"
                },
                data: todoData
            });
            const resp = await response.json();
            console.log(`Created todo with id: ${resp.id}`);
        }

        // Verify that 20 todos have been created
        const response = await request.get(`${URL}todos`, {
            headers: {
                "x-challenger": token,
            },
        });
        const resp = await response.json();
        expect(resp.todos.length).toBe(maxTodos);
    });
});