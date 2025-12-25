# Rule based transformations from svelte to leste



This is a special case of [structural-editing](svelte-codemirror/spec.md)

It is a special case of a posh susyfication, that is translating
an astre into an InputToken tree. That leads to the corresponding posh susy.
An astre is an augmented syntax tree.
A posh susy is a lean user editable representation.
A susy is posh if it uses font style as syntax.
Poshification renders a `Multiline` using the highlight YAML
(`svelte-codemirror/src/highlight.yaml`).
Here the astre is the Svelte compiler AST (an augmented Acorn AST).

We can explore this AST by going in the svelte.dev playground at 

[https://svelte.dev/playground](https://svelte.dev/playground).
![<h1 id="an_id">tutu</h1>](imgs/elt-id/)

The posh susy implementation uses an InputToken tree. The ast field of
an input token points to the corresponding node in the astre.

We illustrate the susyfication mechanism with examples.
To do so, we use a subset of the svelte syntax, html element attributes.
The susy for such  attributes is  inspired by CSS and the rule mechanism

`id="an_id"` translates into `#an_id`
`class="class1 class2"` translates into `.class1 .class2`

This the textual part of the represenation. It is implemented by an InputToken
tree.

The test items are of the form
    name.svelte.yaml
    name.leste.yaml
A test check that a `.svelte.yaml` is translated in the corresponding `.leste.yaml`


id.svelte.yaml

type: Attribute
name: id
value:

## rules

Given a type key, the transformer tries to match the rules for that type 
and use the first rule that matches. A rule transform a node or a subtree 
into an InputToken tree.

A rule is a map. The value 
associated to the gen_ key describe the transformation.
We will adapt the transformer logic when it will be needed.


The rule that handles a id attribute.


```yaml
  -name: id  # the name must be the string "id"
   gen_: 
     kind: leste
     type: id
     text: $value 

```

The case of class attribute is more complex


```yaml
  -name: class  # the name must be the string "class"
   gen_: 
     kind: leste
     type: attrclass
     text: _ $value # calls function Attribute_class with the value of the class key  

```



```yaml
   gen_: 
     kind: leste
     type: attr
     name: $name
     text: $value


```




Attribute:
  -name: id
   gen_: 
     kind: leste
     type: id
     text:  $value
  -name: class 
   gen_: 
