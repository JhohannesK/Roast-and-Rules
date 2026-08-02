export type Preset = {
  id: string;
  label: string;
  emoji: string;
  content: string;
};

export const PRESETS: Preset[] = [
  {
    id: "react-crime",
    label: "Spaghetti React",
    emoji: "🍝",
    content: `// Crime scene #1: the "it works on my machine" component
import React from "react";

function UserProfile(props) {
  const [data, setData] = React.useState(null);
  React.useEffect(() => {
    fetch("/api/user?id=" + props.userId).then((res) => res.json()).then((d) => setData(d));
  }, []);
  let name = "unknown";
  let email = "";
  if (data) { name = data.name; email = data.email; }
  return (
    <div>
      <h1>{name}</h1>
      {props.showEmail ? <p>{email}</p> : null}
      <button onClick={() => window.location.href = "/edit?id=" + props.userId}>Edit</button>
      <div dangerouslySetInnerHTML={{ __html: props.bio }} />
    </div>
  );
}
export default UserProfile;`,
  },
  {
    id: "php-2005",
    label: "PHP from 2005",
    emoji: "🐘",
    content: `<?php
// Crime scene #2: definitely not legacy code
$conn = mysql_connect("localhost", "root", "password123");
mysql_select_db("app", $conn);
$id = $_GET["id"];
$query = "SELECT * FROM users WHERE id = " . $id;
$result = mysql_query($query, $conn);
while ($row = mysql_fetch_array($result)) {
  echo "<tr><td>" . $row["name"] . "</td></tr>";
}
$sql = "UPDATE users SET admin = 1 WHERE id = " . $id;
mysql_query($sql, $conn);
?>`,
  },
  {
    id: "callback-hell",
    label: "Callback Hell",
    emoji: "🔥",
    content: `// Crime scene #3: every promise has a .then pyramid
function loadDashboard(userId, callback) {
  getUser(userId, function (user) {
    if (!user) return callback(new Error("no user"));
    getPosts(user.id, function (posts) {
      getComments(posts[0].id, function (comments) {
        getLikes(comments[0].id, function (likes) {
          callback(null, { user, posts, comments, likes });
        });
      });
    });
  });
}
// also: 47 global variables, zero error handling, no types`,
  },
  {
    id: "python-globals",
    label: "Python Globals",
    emoji: "🐍",
    content: `# Crime scene #4: mutable global state, no tests, docstrings lie
data = []
count = 0
def process(item):
    global count
    data.append(item)
    count += 1
    if count % 2 == 0:
        item = item * 2
    return item
def main():
    for i in range(100):
        process(i)
    print("done:", len(data))
main()`,
  },
  {
    id: "enterprise",
    label: "Enterprise Java",
    emoji: "🏢",
    content: `// Crime scene #5: 14 layers for a TODO app
@Service
public class TodoServiceImpl implements TodoService {
    @Autowired
    private TodoRepository repository;
    @Autowired
    private TodoMapper mapper;

    public GetTodoResponse getTodo(GetTodoRequest request) {
        TodoEntity entity = repository.findById(request.getId()).orElseThrow(
            () -> new TodoNotFoundException("todo not found")
        );
        return mapper.toResponse(entity);
    }
}
// plus: XML config files, generated DTOs, 3 service layers, no tests`,
  },
  {
    id: "boring-app",
    label: "Boring App",
    emoji: "🥱",
    content: `A Next.js + Postgres CRUD app. We ship to Vercel. No tests, no types,
no linting, no CI. Every route is a server action with a string ID. The
schema was designed by committee. Comments say "TODO: fix this". There
are 4,000 lines of generated Prisma client queries in the API layer.`,
  },
];
