1. Api Gateway
 This is the entry point for the LLM, it provides a REST interface for the LLM
 The REST interface should match openrouter's api interface

 a. LLM Library
  This is where the main coordination logic will live. This library will process the request, provide responses, and defer memory requirements to another module. It will request immediate context, and the lora adapter when building context for the processing. It will give new context to the memory module for new data. The interface should also match openrouter's api interface, but as a method.
  The llm will need to be able to invoke tools/functions. The llm, in conjunction with it's various memory modules will be able to decide for itself what it is capable of, and report that to the user. And report what capabilities it needs in order to complete a request. And then request those changes from the development tool via a tool response.

 b. Memory module
  This is where the memory is managed in 3.5 tiers. It will provide a method to give immediate context and a lora adapter for llm processing. It will also provide a method to receive new immediate data for processing. It will also provide a method for adding new medium term memory without adding it to immediate context. It will also provide 2 methods for adding/update reference data, and searching reference data. It will run background processes for processing immediate context into medium term storage. And a second background process for processing medium storage into long term storage.

 c. Proactive module
  This is where the proactive information fetching will live. This will be running a continuous service for scraping data to save into reference, and medium term data. It will keep track of locations where we'll need to re-check for data updates, like feeds of pull requests/commits etc.

 d. Development tool
  This should be a tool that the llm library can invoke in order to make changes to itself, when it decides that changes should be made. It should be able to run continuously until the change is complete, and fully tested. It should save it's new capabilities into short term memory, reference memory and medium term memory.