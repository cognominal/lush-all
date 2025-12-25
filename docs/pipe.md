# Pipes in lush 

We want to use typed pipes like nushell does. For now 
we want focus on piping (unix) commands in each other 
but calling routines. So the whole pipe will be run as one process.
Later we will support the traditional pipe model.



The argument of a routine will be the input type, the return type will be 
the output type.
There will be a jq routine modeled after the js lanaugage to process structured data. Right now jq will just be a literal indexer.

The type supported will be implenented in the enum PipeTypes and  file with extension will map to their respective   .yaml .leste.lyaml, .json

```
toto.json |  0.toto.2   

toto.yaml |  0.toto.2

```
When the initial component of a pipe is a file it will read it for further processing by other components of the path.

# notebook

lbook.lyaml 

We will organize stuff as a notebook.

