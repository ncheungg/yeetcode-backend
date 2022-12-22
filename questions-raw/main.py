import json

final = []


for i in range(1, 27):
  with open(f'{i}.json', 'r') as f:
    data = json.load(f)

    for entry in data:
      newEntry = {}

      topics = []
      url = f'https://leetcode.com/problems/{entry["titleSlug"]}/'
      id = int(entry["frontendQuestionId"])
      difficulty = entry["difficulty"]
      name = entry["title"]
      premium = entry["paidOnly"]

      for topic in entry["topicTags"]:
        topics.append(topic['slug'])

      newEntry["url"] = url
      newEntry["id"] = id
      newEntry["difficulty"] = difficulty
      newEntry["name"] = name
      newEntry["premium"] = premium
      newEntry["topics"] = topics

      final.append(newEntry)


with open('final.json', 'w') as f:
  json.dump(final, f)

# with open(f'{1}.json', 'r') as f:
#     data = json.load(f)

#     for entry in data:
#       newEntry = {}

#       topics = []
#       url = f'https://leetcode.com/problems/{entry["titleSlug"]}/'
#       id = int(entry["frontendQuestionId"])
#       difficulty = entry["difficulty"]
#       name = entry["title"]
#       premium = entry["paidOnly"]

#       for topic in entry["topicTags"]:
#         topics.append(topic['slug'])

#       newEntry["url"] = url
#       newEntry["id"] = id
#       newEntry["difficulty"] = difficulty
#       newEntry["name"] = name
#       newEntry["premium"] = premium
#       newEntry["topics"] = topics

#       final.append(newEntry)

# print(str(final))
# copy2clip(str(final))

      