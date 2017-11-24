# Internal Experimental Words

## `clock`

## `stringify`

## `parse-json`

## `regexp`
convert string to RegExp

## `match`

## `test?`

## `replace`

## `||>` (apply)

## `fork`
evalues the quote in a child environment

( [A] -> [a] )

```
f♭> [ 1 2 * ] fork
[ [ 2 ] ]
```

## `spawn`
evalues the quote in a child environment, returns a future

( [A] -> {future} )

## `await`
evalues the quote in a child environment, waits for result

( [A] -> [a] )

## `send`
pushes one element from stack to parent.

( A -> )

```
f♭> [ 1 2 3 send 4 ] fork
[ 3 [ 1 2 4 ] ]
```

## `return`
pushes current stack to parent

( ... -> )

```
f♭> [ 1 2 3 return 4 ] fork
[ 1 2 3 [ 4 ] ]
```

## `suspend`
stops execution, push queue to stack, loses other state

( ... -> )

```
f♭> [ 1 2 * suspend 3 4 *  ] fork
[ [ 2 3 4 * ] ]
```

## `all`
executes each element in a child environment

( [ A B C ]-> [ [a] [b] [c] ])

## `race`
executes each element in a child environment, returns first to finish

( [ A B C ]-> [x])