import mitt from "mitt"

type Events = {
  presentLoader: {
    message?: string
    backdropDismiss?: boolean
  } | undefined
  dismissLoader: undefined
}

const emitter = mitt<Events>()

export default emitter
