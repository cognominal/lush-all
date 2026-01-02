# Recursively maps every value to its type
walk(
  if type == "array" then map(type) | unique
  elif type == "object" then map_values(type)
  else type
  end
)
