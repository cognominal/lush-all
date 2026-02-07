# Leste

See [Proj.md](./PROJ.md) and [glossary.md](/glossary.md)

Leste is a posh projection of the acorn AST augmented by svelte.
Unlike the current one it does not attempt to match the original svelte layout.

Currently we want to implement a subset : html element with attributes and text

Tags and closing tags will have kt `Leste.Tag`.
Attribute names will have kl `Leste.AttrNm`
Attribute values will have kt `Leste.String`. Because of poshing double quotes are
unnecessary.
Id attrs, class attrs and data-* are special cased.
For id attrs and class attrs, the attr name is not shown and the following `=`
The id attr value is prefixed with `#`, and the class value components are prefixed
by a `.`. This is inspired by CSS selectors.

Text will have kt Leste.Text. Because of poshing no escaping is needed.

Below is a svelte original and the leste counterpart as text (without styling.)

Leste lines are no longer than 80 chars
Closing tags.

```svelte
<h1 id="the-id" class="a b" data-foo="foo" >&lt;test&gt;</h1>
```

```leste
h1 #id .a .b  foo=foo<test> 


```

```svelte
First <b>bold</b> and <b>bold and <i>italic</i>within</b>
```

```leste
First bbold/b and bbold and iitalic/i within/b 
```

So far, we don't have element that spans many lines.
In leste, when an element spans many lines we don't display
a closing tag.
Inner tag in a multiline element are denoted by indentation.
